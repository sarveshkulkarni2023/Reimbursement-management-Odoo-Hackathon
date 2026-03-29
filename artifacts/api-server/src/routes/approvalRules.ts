import { Router } from "express";
import { db, approvalRulesTable, approvalStepsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, requireRole } from "../lib/auth";
import { z } from "zod";

const router = Router();

async function getRuleWithDetails(ruleId: number, companyId: number) {
  const [rule] = await db.select().from(approvalRulesTable)
    .where(and(eq(approvalRulesTable.id, ruleId), eq(approvalRulesTable.companyId, companyId)))
    .limit(1);
  if (!rule) return null;

  const steps = await db.select().from(approvalStepsTable)
    .where(eq(approvalStepsTable.ruleId, ruleId))
    .orderBy(approvalStepsTable.stepNumber);

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

  return { ...rule, steps: stepsWithApprovers, specificApproverName };
}

router.get("/", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const rules = await db.select().from(approvalRulesTable)
    .where(and(eq(approvalRulesTable.companyId, user.companyId), eq(approvalRulesTable.isActive, true)));

  const rulesWithDetails = await Promise.all(
    rules.map(rule => getRuleWithDetails(rule.id, user.companyId))
  );

  res.json(rulesWithDetails.filter(Boolean));
});

const stepSchema = z.object({
  stepNumber: z.number().int().min(1),
  approverId: z.number().int(),
  isManagerStep: z.boolean().default(false),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  isDefault: z.boolean().optional().default(false),
  conditionType: z.enum(["sequential", "percentage", "specific_approver", "hybrid"]),
  percentageThreshold: z.number().min(1).max(100).nullable().optional(),
  specificApproverId: z.number().int().nullable().optional(),
  steps: z.array(stepSchema).min(1),
});

router.post("/", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  // If this is set as default, unset other defaults
  if (parsed.data.isDefault) {
    await db.update(approvalRulesTable)
      .set({ isDefault: false })
      .where(eq(approvalRulesTable.companyId, user.companyId));
  }

  const [rule] = await db.insert(approvalRulesTable).values({
    name: parsed.data.name,
    description: parsed.data.description || null,
    companyId: user.companyId,
    isDefault: parsed.data.isDefault || false,
    conditionType: parsed.data.conditionType,
    percentageThreshold: parsed.data.percentageThreshold?.toString() || null,
    specificApproverId: parsed.data.specificApproverId || null,
  }).returning();

  // Insert steps
  for (const step of parsed.data.steps) {
    await db.insert(approvalStepsTable).values({
      ruleId: rule.id,
      stepNumber: step.stepNumber,
      approverId: step.approverId,
      isManagerStep: step.isManagerStep,
    });
  }

  const detail = await getRuleWithDetails(rule.id, user.companyId);
  res.status(201).json(detail);
});

router.get("/:ruleId", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const ruleId = parseInt(req.params.ruleId);
  if (isNaN(ruleId)) {
    res.status(400).json({ error: "Invalid rule ID" });
    return;
  }

  const detail = await getRuleWithDetails(ruleId, user.companyId);
  if (!detail) {
    res.status(404).json({ error: "Approval rule not found" });
    return;
  }

  res.json(detail);
});

router.put("/:ruleId", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const ruleId = parseInt(req.params.ruleId);
  if (isNaN(ruleId)) {
    res.status(400).json({ error: "Invalid rule ID" });
    return;
  }

  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", details: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(approvalRulesTable)
    .where(and(eq(approvalRulesTable.id, ruleId), eq(approvalRulesTable.companyId, user.companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Approval rule not found" });
    return;
  }

  if (parsed.data.isDefault) {
    await db.update(approvalRulesTable)
      .set({ isDefault: false })
      .where(eq(approvalRulesTable.companyId, user.companyId));
  }

  await db.update(approvalRulesTable).set({
    name: parsed.data.name,
    description: parsed.data.description || null,
    isDefault: parsed.data.isDefault || false,
    conditionType: parsed.data.conditionType,
    percentageThreshold: parsed.data.percentageThreshold?.toString() || null,
    specificApproverId: parsed.data.specificApproverId || null,
    updatedAt: new Date(),
  }).where(eq(approvalRulesTable.id, ruleId));

  // Delete existing steps and recreate
  await db.delete(approvalStepsTable).where(eq(approvalStepsTable.ruleId, ruleId));

  for (const step of parsed.data.steps) {
    await db.insert(approvalStepsTable).values({
      ruleId,
      stepNumber: step.stepNumber,
      approverId: step.approverId,
      isManagerStep: step.isManagerStep,
    });
  }

  const detail = await getRuleWithDetails(ruleId, user.companyId);
  res.json(detail);
});

router.delete("/:ruleId", authenticate, requireRole("admin"), async (req, res) => {
  const user = (req as any).user;
  const ruleId = parseInt(req.params.ruleId);
  if (isNaN(ruleId)) {
    res.status(400).json({ error: "Invalid rule ID" });
    return;
  }

  const [existing] = await db.select().from(approvalRulesTable)
    .where(and(eq(approvalRulesTable.id, ruleId), eq(approvalRulesTable.companyId, user.companyId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Approval rule not found" });
    return;
  }

  await db.update(approvalRulesTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(approvalRulesTable.id, ruleId));

  res.json({ message: "Approval rule deleted successfully" });
});

export default router;
