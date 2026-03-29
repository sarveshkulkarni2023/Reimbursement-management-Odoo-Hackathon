import { Router } from "express";
import { db, expensesTable, usersTable, approvalActionsTable } from "@workspace/db";
import { eq, and, inArray, sql, count, sum } from "drizzle-orm";
import { authenticate } from "../lib/auth";

const router = Router();

router.get("/dashboard", authenticate, async (req, res) => {
  const user = (req as any).user;

  let expenseFilter: any[] = [eq(expensesTable.companyId, user.companyId)];

  if (user.role === "employee") {
    expenseFilter.push(eq(expensesTable.submittedById, user.id));
  } else if (user.role === "manager") {
    const teamMembers = await db.select().from(usersTable)
      .where(and(eq(usersTable.managerId, user.id), eq(usersTable.companyId, user.companyId)));
    const teamIds = [user.id, ...teamMembers.map(m => m.id)];
    expenseFilter.push(inArray(expensesTable.submittedById, teamIds));
  }

  const condition = and(...expenseFilter);

  const [totals] = await db.select({
    total: count(),
    pending: sql<number>`SUM(CASE WHEN ${expensesTable.status} = 'pending' THEN 1 ELSE 0 END)`,
    approved: sql<number>`SUM(CASE WHEN ${expensesTable.status} = 'approved' THEN 1 ELSE 0 END)`,
    rejected: sql<number>`SUM(CASE WHEN ${expensesTable.status} = 'rejected' THEN 1 ELSE 0 END)`,
    amountPending: sql<number>`SUM(CASE WHEN ${expensesTable.status} = 'pending' THEN CAST(${expensesTable.amountInCompanyCurrency} AS DECIMAL) ELSE 0 END)`,
    amountApproved: sql<number>`SUM(CASE WHEN ${expensesTable.status} = 'approved' THEN CAST(${expensesTable.amountInCompanyCurrency} AS DECIMAL) ELSE 0 END)`,
  }).from(expensesTable).where(condition);

  const categoryTotals = await db.select({
    category: expensesTable.category,
    count: count(),
    total: sql<number>`SUM(CAST(${expensesTable.amountInCompanyCurrency} AS DECIMAL))`,
  }).from(expensesTable).where(condition).groupBy(expensesTable.category);

  const recentExpenses = await db.select().from(expensesTable)
    .where(condition)
    .orderBy(sql`${expensesTable.createdAt} DESC`)
    .limit(5);

  const recentWithNames = await Promise.all(recentExpenses.map(async (exp) => {
    const [submitter] = await db.select().from(usersTable).where(eq(usersTable.id, exp.submittedById)).limit(1);
    return { ...exp, submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : "Unknown" };
  }));

  // Count pending approvals for this user
  let pendingApprovals = 0;
  if (user.role === "manager" || user.role === "admin") {
    const [{ cnt }] = await db.select({ cnt: count() }).from(approvalActionsTable)
      .where(and(eq(approvalActionsTable.approverId, user.id), eq(approvalActionsTable.action, "pending")));
    pendingApprovals = cnt;
  }

  res.json({
    totalExpenses: totals.total || 0,
    pendingExpenses: Number(totals.pending) || 0,
    approvedExpenses: Number(totals.approved) || 0,
    rejectedExpenses: Number(totals.rejected) || 0,
    totalAmountPending: parseFloat((totals.amountPending || 0).toString()),
    totalAmountApproved: parseFloat((totals.amountApproved || 0).toString()),
    expensesByCategory: categoryTotals.map(c => ({
      category: c.category,
      count: c.count,
      total: parseFloat((c.total || 0).toString()),
    })),
    recentExpenses: recentWithNames,
    pendingApprovals,
  });
});

export default router;
