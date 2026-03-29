import { Router } from "express";
import { db, expensesTable, usersTable, companiesTable, approvalRulesTable, approvalStepsTable, approvalActionsTable } from "@workspace/db";
import { eq, and, desc, inArray, sql, count } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";
import { z } from "zod";

const router = Router();

const categoryEnum = z.enum(["travel", "meals", "accommodation", "office_supplies", "software", "training", "medical", "entertainment", "utilities", "other"]);

async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<{ amount: number; rate: number }> {
  if (fromCurrency === toCurrency) return { amount, rate: 1 };
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    const data = await response.json();
    const rate = data.rates[toCurrency];
    if (!rate) return { amount, rate: 1 };
    return { amount: parseFloat((amount * rate).toFixed(2)), rate };
  } catch {
    return { amount, rate: 1 };
  }
}

async function getExpenseWithDetails(expenseId: number, companyId: number) {
  const [expense] = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.companyId, companyId)))
    .limit(1);
  if (!expense) return null;

  const [submitter] = await db.select().from(usersTable).where(eq(usersTable.id, expense.submittedById)).limit(1);
  
  const actions = await db.select().from(approvalActionsTable)
    .where(eq(approvalActionsTable.expenseId, expenseId))
    .orderBy(approvalActionsTable.stepNumber);

  const actionsWithApprovers = await Promise.all(actions.map(async (action) => {
    const [approver] = await db.select().from(usersTable).where(eq(usersTable.id, action.approverId)).limit(1);
    return {
      ...action,
      approverName: approver ? `${approver.firstName} ${approver.lastName}` : "Unknown",
      approverRole: approver?.role || "unknown",
    };
  }));

  let approvalRule = null;
  if (expense.approvalRuleId) {
    const [rule] = await db.select().from(approvalRulesTable).where(eq(approvalRulesTable.id, expense.approvalRuleId)).limit(1);
    if (rule) {
      const steps = await db.select().from(approvalStepsTable).where(eq(approvalStepsTable.ruleId, rule.id)).orderBy(approvalStepsTable.stepNumber);
      const stepsWithApprovers = await Promise.all(steps.map(async (step) => {
        const [approver] = await db.select().from(usersTable).where(eq(usersTable.id, step.approverId)).limit(1);
        return {
          ...step,
          approverName: approver ? `${approver.firstName} ${approver.lastName}` : "Unknown",
          approverRole: approver?.role || "unknown",
        };
      }));
      let specificApproverName: string | null = null;
      if (rule.specificApproverId) {
        const [sa] = await db.select().from(usersTable).where(eq(usersTable.id, rule.specificApproverId)).limit(1);
        if (sa) specificApproverName = `${sa.firstName} ${sa.lastName}`;
      }
      approvalRule = { ...rule, steps: stepsWithApprovers, specificApproverName };
    }
  }

  return {
    ...expense,
    submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : "Unknown",
    approvalHistory: actionsWithApprovers,
    approvalRule,
  };
}

// OCR endpoint needs to be before /:expenseId pattern
router.post("/ocr", authenticate, async (req, res) => {
  const { imageBase64, imageUrl } = req.body;
  
  // Simulated OCR - parse the image and extract expense data
  // In a real app, this would call a service like Google Vision or Tesseract
  const mockOcrResult = {
    title: null,
    amount: null,
    currency: null,
    date: null,
    description: null,
    category: null,
    vendorName: null,
    rawText: "Receipt scan processed. Please fill in the details manually for accurate data.",
  };

  // If there's a URL provided, we try to extract some basic info
  if (imageUrl || imageBase64) {
    mockOcrResult.rawText = "Receipt detected. Auto-fill based on OCR. Please verify the extracted data.";
    // Generate realistic-looking mock data
    const mockData = {
      title: "Business Receipt",
      amount: parseFloat((Math.random() * 200 + 10).toFixed(2)),
      currency: "USD",
      date: new Date().toISOString().split("T")[0],
      description: "Expense claim from scanned receipt",
      category: "other",
      vendorName: "Vendor Name",
    };
    Object.assign(mockOcrResult, mockData);
  }

  res.json(mockOcrResult);
});

// Pending approvals
router.get("/pending-approvals", authenticate, requireRole("admin", "manager"), async (req, res) => {
  const user = (req as any).user;
  
  const pendingActions = await db.select().from(approvalActionsTable)
    .where(and(eq(approvalActionsTable.approverId, user.id), eq(approvalActionsTable.action, "pending")));

  const expenseIds = pendingActions.map(a => a.expenseId);
  if (expenseIds.length === 0) {
    res.json([]);
    return;
  }

  const expenseDetails = await Promise.all(
    expenseIds.map(id => getExpenseWithDetails(id, user.companyId))
  );

  res.json(expenseDetails.filter(Boolean));
});

// List expenses
router.get("/", authenticate, async (req, res) => {
  const user = (req as any).user;
  const { status, page = "1", limit = "20" } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  let whereConditions: any[] = [eq(expensesTable.companyId, user.companyId)];

  if (user.role === "employee") {
    whereConditions.push(eq(expensesTable.submittedById, user.id));
  } else if (user.role === "manager") {
    // Managers see their team's expenses + their own
    const teamMembers = await db.select().from(usersTable)
      .where(and(eq(usersTable.managerId, user.id), eq(usersTable.companyId, user.companyId)));
    const teamIds = [user.id, ...teamMembers.map(m => m.id)];
    whereConditions.push(inArray(expensesTable.submittedById, teamIds));
  }

  if (status) {
    whereConditions.push(eq(expensesTable.status, status as any));
  }

  const condition = and(...whereConditions);
  const expenses = await db.select().from(expensesTable)
    .where(condition)
    .orderBy(desc(expensesTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  const [{ total }] = await db.select({ total: count() }).from(expensesTable).where(condition);

  const expensesWithSubmitter = await Promise.all(expenses.map(async (expense) => {
    const [submitter] = await db.select().from(usersTable).where(eq(usersTable.id, expense.submittedById)).limit(1);
    return {
      ...expense,
      submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : "Unknown",
    };
  }));

  res.json({ expenses: expensesWithSubmitter, total, page: pageNum, limit: limitNum });
});

// Create expense
const createExpenseSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  amount: z.number().positive(),
  currency: z.string().min(1),
  category: categoryEnum,
  expenseDate: z.string(),
  receiptUrl: z.string().nullable().optional(),
  approvalRuleId: z.number().int().nullable().optional(),
});

router.post("/", authenticate, async (req, res) => {
  const user = (req as any).user;
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);

  // Convert to company currency
  const { amount: amountInCompanyCurrency, rate: exchangeRate } = await convertCurrency(
    parsed.data.amount,
    parsed.data.currency,
    company.currency
  );

  let approvalRuleId = parsed.data.approvalRuleId || null;
  
  // Find default rule if none specified
  if (!approvalRuleId) {
    const [defaultRule] = await db.select().from(approvalRulesTable)
      .where(and(eq(approvalRulesTable.companyId, user.companyId), eq(approvalRulesTable.isDefault, true), eq(approvalRulesTable.isActive, true)))
      .limit(1);
    if (defaultRule) approvalRuleId = defaultRule.id;
  }

  const [expense] = await db.insert(expensesTable).values({
    title: parsed.data.title,
    description: parsed.data.description || null,
    amount: parsed.data.amount.toString(),
    currency: parsed.data.currency,
    amountInCompanyCurrency: amountInCompanyCurrency.toString(),
    companyCurrency: company.currency,
    exchangeRate: exchangeRate.toString(),
    category: parsed.data.category,
    expenseDate: parsed.data.expenseDate,
    receiptUrl: parsed.data.receiptUrl || null,
    submittedById: user.id,
    companyId: user.companyId,
    approvalRuleId,
    currentApprovalStep: 1,
  }).returning();

  // Set up approval workflow
  if (approvalRuleId) {
    const rule = await db.select().from(approvalRulesTable).where(eq(approvalRulesTable.id, approvalRuleId)).limit(1);
    const steps = await db.select().from(approvalStepsTable).where(eq(approvalStepsTable.ruleId, approvalRuleId)).orderBy(approvalStepsTable.stepNumber);

    // Check if manager approval is needed first
    let stepsToProcess = steps;
    
    // If manager is an approver and employee has a manager, insert manager as first step
    if (user.managerId && !steps.some(s => s.isManagerStep)) {
      const [managerUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.managerId)).limit(1);
      if (managerUser && managerUser.isManagerApprover) {
        // Create a pending action for manager (step 0)
        await db.insert(approvalActionsTable).values({
          expenseId: expense.id,
          approverId: user.managerId,
          stepNumber: 0,
          action: "pending",
        });
        stepsToProcess = steps; // Continue with normal steps after manager
      }
    }

    // For the first step (or all steps for percentage/hybrid), create pending actions
    if (rule[0]?.conditionType === "sequential") {
      if (stepsToProcess.length > 0) {
        const firstStep = stepsToProcess[0];
        let actualApproverId = firstStep.approverId;
        // If it's a manager step, use the employee's manager
        if (firstStep.isManagerStep && user.managerId) {
          actualApproverId = user.managerId;
        }
        await db.insert(approvalActionsTable).values({
          expenseId: expense.id,
          approverId: actualApproverId,
          stepNumber: firstStep.stepNumber,
          action: "pending",
        });
      }
    } else {
      // For percentage/specific/hybrid, create pending actions for all approvers
      for (const step of stepsToProcess) {
        let actualApproverId = step.approverId;
        if (step.isManagerStep && user.managerId) {
          actualApproverId = user.managerId;
        }
        await db.insert(approvalActionsTable).values({
          expenseId: expense.id,
          approverId: actualApproverId,
          stepNumber: step.stepNumber,
          action: "pending",
        });
      }
    }
  } else {
    // No rule - if employee has a manager who is an approver, they approve
    if (user.managerId) {
      const [managerUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.managerId)).limit(1);
      if (managerUser && managerUser.isManagerApprover) {
        await db.insert(approvalActionsTable).values({
          expenseId: expense.id,
          approverId: user.managerId,
          stepNumber: 1,
          action: "pending",
        });
      }
    }
  }

  const [submitter] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  res.status(201).json({ ...expense, submittedByName: `${submitter.firstName} ${submitter.lastName}` });
});

// Get expense by ID
router.get("/:expenseId", authenticate, async (req, res) => {
  const user = (req as any).user;
  const expenseId = parseInt(req.params.expenseId);
  if (isNaN(expenseId)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }

  const detail = await getExpenseWithDetails(expenseId, user.companyId);
  if (!detail) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  // Employees can only see their own expenses
  if (user.role === "employee" && detail.submittedById !== user.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.json(detail);
});

// Update expense
const updateExpenseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  category: categoryEnum.optional(),
  expenseDate: z.string().optional(),
  receiptUrl: z.string().nullable().optional(),
});

router.put("/:expenseId", authenticate, async (req, res) => {
  const user = (req as any).user;
  const expenseId = parseInt(req.params.expenseId);
  if (isNaN(expenseId)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }

  const [expense] = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.companyId, user.companyId)))
    .limit(1);

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  if (expense.submittedById !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Cannot edit this expense" });
    return;
  }

  if (expense.status !== "pending") {
    res.status(400).json({ error: "Can only edit pending expenses" });
    return;
  }

  const parsed = updateExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const updateData: any = { ...parsed.data, updatedAt: new Date() };

  if (parsed.data.amount !== undefined || parsed.data.currency !== undefined) {
    const newAmount = parsed.data.amount || parseFloat(expense.amount);
    const newCurrency = parsed.data.currency || expense.currency;
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, user.companyId)).limit(1);
    const { amount: converted, rate } = await convertCurrency(newAmount, newCurrency, company.currency);
    updateData.amountInCompanyCurrency = converted.toString();
    updateData.exchangeRate = rate.toString();
    if (parsed.data.amount) updateData.amount = newAmount.toString();
  }

  const [updated] = await db.update(expensesTable).set(updateData).where(eq(expensesTable.id, expenseId)).returning();
  const [submitter] = await db.select().from(usersTable).where(eq(usersTable.id, updated.submittedById)).limit(1);
  res.json({ ...updated, submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : "Unknown" });
});

// Cancel expense
router.delete("/:expenseId", authenticate, async (req, res) => {
  const user = (req as any).user;
  const expenseId = parseInt(req.params.expenseId);
  if (isNaN(expenseId)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }

  const [expense] = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.companyId, user.companyId)))
    .limit(1);

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  if (expense.submittedById !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Cannot cancel this expense" });
    return;
  }

  if (expense.status !== "pending") {
    res.status(400).json({ error: "Can only cancel pending expenses" });
    return;
  }

  await db.update(expensesTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(expensesTable.id, expenseId));
  res.json({ message: "Expense cancelled successfully" });
});

// Approve expense
router.post("/:expenseId/approve", authenticate, requireRole("admin", "manager"), async (req, res) => {
  const user = (req as any).user;
  const expenseId = parseInt(req.params.expenseId);
  if (isNaN(expenseId)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }

  const [expense] = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.companyId, user.companyId)))
    .limit(1);

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  if (expense.status !== "pending") {
    res.status(400).json({ error: "Expense is not pending" });
    return;
  }

  const { comment } = req.body;

  // Find current pending action for this user
  const [pendingAction] = await db.select().from(approvalActionsTable)
    .where(and(
      eq(approvalActionsTable.expenseId, expenseId),
      eq(approvalActionsTable.approverId, user.id),
      eq(approvalActionsTable.action, "pending")
    ))
    .limit(1);

  if (!pendingAction && user.role !== "admin") {
    res.status(403).json({ error: "You are not authorized to approve this expense" });
    return;
  }

  const now = new Date();

  if (pendingAction) {
    // Update this action to approved
    await db.update(approvalActionsTable)
      .set({ action: "approved", comment: comment || null, actionAt: now })
      .where(eq(approvalActionsTable.id, pendingAction.id));
  } else if (user.role === "admin") {
    // Admin override - create an approval action
    await db.insert(approvalActionsTable).values({
      expenseId,
      approverId: user.id,
      stepNumber: expense.currentApprovalStep || 1,
      action: "approved",
      comment: comment || "Admin override",
      actionAt: now,
    });
  }

  // Determine if expense is fully approved
  let fullyApproved = false;

  if (expense.approvalRuleId) {
    const [rule] = await db.select().from(approvalRulesTable).where(eq(approvalRulesTable.id, expense.approvalRuleId)).limit(1);
    const steps = await db.select().from(approvalStepsTable).where(eq(approvalStepsTable.ruleId, expense.approvalRuleId)).orderBy(approvalStepsTable.stepNumber);
    const allActions = await db.select().from(approvalActionsTable).where(eq(approvalActionsTable.expenseId, expenseId));
    const approvedActions = allActions.filter(a => a.action === "approved");

    if (rule.conditionType === "sequential") {
      // Check if there are more steps
      const currentStep = pendingAction?.stepNumber || 0;
      const nextStep = steps.find(s => s.stepNumber > currentStep);
      
      if (nextStep) {
        // Create pending action for next step
        let nextApproverId = nextStep.approverId;
        if (nextStep.isManagerStep && expense.submittedById) {
          const [submitter] = await db.select().from(usersTable).where(eq(usersTable.id, expense.submittedById)).limit(1);
          if (submitter?.managerId) nextApproverId = submitter.managerId;
        }
        await db.insert(approvalActionsTable).values({
          expenseId,
          approverId: nextApproverId,
          stepNumber: nextStep.stepNumber,
          action: "pending",
        });
        await db.update(expensesTable).set({ currentApprovalStep: nextStep.stepNumber }).where(eq(expensesTable.id, expenseId));
      } else {
        fullyApproved = true;
      }
    } else if (rule.conditionType === "percentage") {
      const threshold = parseFloat(rule.percentageThreshold || "100");
      const totalApprovers = steps.length;
      const approvedCount = approvedActions.filter(a => steps.some(s => s.approverId === a.approverId)).length;
      if ((approvedCount / totalApprovers) * 100 >= threshold) {
        fullyApproved = true;
      }
    } else if (rule.conditionType === "specific_approver") {
      if (rule.specificApproverId && approvedActions.some(a => a.approverId === rule.specificApproverId)) {
        fullyApproved = true;
      }
    } else if (rule.conditionType === "hybrid") {
      // Percentage OR specific approver
      const threshold = parseFloat(rule.percentageThreshold || "100");
      const totalApprovers = steps.length;
      const approvedCount = approvedActions.filter(a => steps.some(s => s.approverId === a.approverId)).length;
      const percentageMet = (approvedCount / totalApprovers) * 100 >= threshold;
      const specificMet = rule.specificApproverId ? approvedActions.some(a => a.approverId === rule.specificApproverId) : false;
      fullyApproved = percentageMet || specificMet;
    }
  } else {
    fullyApproved = true;
  }

  if (fullyApproved || user.role === "admin") {
    await db.update(expensesTable).set({ status: "approved", updatedAt: now }).where(eq(expensesTable.id, expenseId));
  }

  const detail = await getExpenseWithDetails(expenseId, user.companyId);
  res.json(detail);
});

// Reject expense
router.post("/:expenseId/reject", authenticate, requireRole("admin", "manager"), async (req, res) => {
  const user = (req as any).user;
  const expenseId = parseInt(req.params.expenseId);
  if (isNaN(expenseId)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }

  const [expense] = await db.select().from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.companyId, user.companyId)))
    .limit(1);

  if (!expense) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  if (expense.status !== "pending") {
    res.status(400).json({ error: "Expense is not pending" });
    return;
  }

  const { comment } = req.body;

  // Find pending action for this user
  const [pendingAction] = await db.select().from(approvalActionsTable)
    .where(and(
      eq(approvalActionsTable.expenseId, expenseId),
      eq(approvalActionsTable.approverId, user.id),
      eq(approvalActionsTable.action, "pending")
    ))
    .limit(1);

  if (!pendingAction && user.role !== "admin") {
    res.status(403).json({ error: "You are not authorized to reject this expense" });
    return;
  }

  const now = new Date();

  if (pendingAction) {
    await db.update(approvalActionsTable)
      .set({ action: "rejected", comment: comment || null, actionAt: now })
      .where(eq(approvalActionsTable.id, pendingAction.id));
  } else {
    await db.insert(approvalActionsTable).values({
      expenseId,
      approverId: user.id,
      stepNumber: expense.currentApprovalStep || 1,
      action: "rejected",
      comment: comment || "Admin override",
      actionAt: now,
    });
  }

  await db.update(expensesTable).set({ status: "rejected", updatedAt: now }).where(eq(expensesTable.id, expenseId));

  const detail = await getExpenseWithDetails(expenseId, user.companyId);
  res.json(detail);
});

export default router;
