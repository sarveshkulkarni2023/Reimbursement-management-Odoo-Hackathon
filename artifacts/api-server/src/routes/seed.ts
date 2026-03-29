import { Router } from "express";
import { db, usersTable, expensesTable, approvalRulesTable, approvalStepsTable, approvalActionsTable, companiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole, createPasswordHash } from "../lib/auth";

const router = Router();

router.post("/demo", authenticate, requireRole("admin"), async (req, res) => {
  const adminUser = (req as any).user;
  const companyId = adminUser.companyId;

  const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);

  // Create managers
  const managers: any[] = [];
  const managerData = [
    { email: "sarah.manager@demo.com", firstName: "Sarah", lastName: "Chen", password: "demo1234" },
    { email: "james.manager@demo.com", firstName: "James", lastName: "Rodriguez", password: "demo1234" },
  ];

  for (const m of managerData) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, m.email)).limit(1);
    if (!existing) {
      const [manager] = await db.insert(usersTable).values({
        email: m.email,
        passwordHash: createPasswordHash(m.password),
        firstName: m.firstName,
        lastName: m.lastName,
        role: "manager",
        isManagerApprover: true,
        companyId,
      }).returning();
      managers.push(manager);
    } else {
      managers.push(existing);
    }
  }

  // Create employees
  const employees: any[] = [];
  const employeeData = [
    { email: "alice.employee@demo.com", firstName: "Alice", lastName: "Kim" },
    { email: "bob.employee@demo.com", firstName: "Bob", lastName: "Martinez" },
    { email: "carol.employee@demo.com", firstName: "Carol", lastName: "Johnson" },
    { email: "david.employee@demo.com", firstName: "David", lastName: "Lee" },
  ];

  for (let i = 0; i < employeeData.length; i++) {
    const e = employeeData[i];
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, e.email)).limit(1);
    if (!existing) {
      const [emp] = await db.insert(usersTable).values({
        email: e.email,
        passwordHash: createPasswordHash("demo1234"),
        firstName: e.firstName,
        lastName: e.lastName,
        role: "employee",
        managerId: managers[i % managers.length]?.id || null,
        companyId,
      }).returning();
      employees.push(emp);
    } else {
      employees.push(existing);
    }
  }

  // Create an approval rule
  let approvalRule: any = null;
  const [existingRule] = await db.select().from(approvalRulesTable)
    .where(and(eq(approvalRulesTable.companyId, companyId), eq(approvalRulesTable.name, "Standard Approval")))
    .limit(1);

  if (!existingRule) {
    const [rule] = await db.insert(approvalRulesTable).values({
      name: "Standard Approval",
      description: "Manager approves, then admin confirms",
      companyId,
      isDefault: true,
      conditionType: "sequential",
    }).returning();
    approvalRule = rule;

    if (managers[0]) {
      await db.insert(approvalStepsTable).values({
        ruleId: rule.id,
        stepNumber: 1,
        approverId: managers[0].id,
        isManagerStep: false,
      });
    }
    await db.insert(approvalStepsTable).values({
      ruleId: rule.id,
      stepNumber: 2,
      approverId: adminUser.id,
      isManagerStep: false,
    });
  } else {
    approvalRule = existingRule;
  }

  // Create a second approval rule - percentage-based
  const [existingRule2] = await db.select().from(approvalRulesTable)
    .where(and(eq(approvalRulesTable.companyId, companyId), eq(approvalRulesTable.name, "Committee Approval")))
    .limit(1);

  if (!existingRule2 && managers.length >= 1) {
    const [rule2] = await db.insert(approvalRulesTable).values({
      name: "Committee Approval",
      description: "Any 1 of 2 managers can approve",
      companyId,
      isDefault: false,
      conditionType: "percentage",
      percentageThreshold: "50",
    }).returning();

    for (let i = 0; i < managers.length; i++) {
      await db.insert(approvalStepsTable).values({
        ruleId: rule2.id,
        stepNumber: i + 1,
        approverId: managers[i].id,
        isManagerStep: false,
      });
    }
  }

  // Create expenses in various states
  const categories = ["travel", "meals", "accommodation", "software", "office_supplies", "training", "entertainment"] as const;
  const expenseTitles = [
    "Flight to NYC Conference",
    "Team Lunch at Nobu",
    "Hotel for Client Visit",
    "Figma Subscription",
    "Office Chairs x2",
    "AWS Certification Course",
    "Client Dinner - Q4 Review",
    "Taxi to Airport",
    "Starbucks Coffee Meeting",
    "MacBook Pro Laptop",
    "Annual Slack Renewal",
    "Team Building Activity",
  ];

  const submitters = [...employees, adminUser];

  for (let i = 0; i < expenseTitles.length; i++) {
    const submitter = submitters[i % submitters.length];
    const amount = (50 + Math.floor(Math.random() * 4950)).toString();
    const category = categories[i % categories.length];
    const daysAgo = Math.floor(Math.random() * 60);
    const expenseDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const statuses = ["pending", "pending", "approved", "approved", "approved", "rejected", "pending", "approved", "pending", "approved", "rejected", "pending"] as const;
    const status = statuses[i];

    const [expense] = await db.insert(expensesTable).values({
      title: expenseTitles[i],
      amount,
      currency: company.currency,
      amountInCompanyCurrency: amount,
      companyCurrency: company.currency,
      exchangeRate: "1",
      category,
      expenseDate,
      submittedById: submitter.id,
      companyId,
      approvalRuleId: approvalRule?.id || null,
      status,
      currentApprovalStep: 1,
    }).returning();

    const approver = managers[i % managers.length] || adminUser;

    if (status === "approved" && approver) {
      await db.insert(approvalActionsTable).values({
        expenseId: expense.id,
        approverId: approver.id,
        stepNumber: 1,
        action: "approved",
        comment: i % 3 === 0 ? "Looks good, approved!" : null,
        actionAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
      });
    } else if (status === "rejected" && approver) {
      await db.insert(approvalActionsTable).values({
        expenseId: expense.id,
        approverId: approver.id,
        stepNumber: 1,
        action: "rejected",
        comment: "Insufficient documentation. Please resubmit with receipts.",
        actionAt: new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000),
      });
    } else if (status === "pending" && approver) {
      await db.insert(approvalActionsTable).values({
        expenseId: expense.id,
        approverId: approver.id,
        stepNumber: 1,
        action: "pending",
      });
    }
  }

  res.json({
    message: "Demo data loaded successfully",
    created: {
      managers: managers.length,
      employees: employees.length,
      approvalRules: 2,
      expenses: expenseTitles.length,
    },
  });
});

export default router;
