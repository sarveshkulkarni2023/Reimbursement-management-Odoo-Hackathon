import { pgTable, serial, text, timestamp, boolean, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

export const conditionTypeEnum = pgEnum("condition_type", [
  "sequential", "percentage", "specific_approver", "hybrid"
]);

export const approvalRulesTable = pgTable("approval_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  isDefault: boolean("is_default").notNull().default(false),
  conditionType: conditionTypeEnum("condition_type").notNull().default("sequential"),
  percentageThreshold: numeric("percentage_threshold", { precision: 5, scale: 2 }),
  specificApproverId: integer("specific_approver_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const approvalStepsTable = pgTable("approval_steps", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").notNull().references(() => approvalRulesTable.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  approverId: integer("approver_id").notNull().references(() => usersTable.id),
  isManagerStep: boolean("is_manager_step").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApprovalRuleSchema = createInsertSchema(approvalRulesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalStepSchema = createInsertSchema(approvalStepsTable).omit({ id: true, createdAt: true });
export type InsertApprovalRule = z.infer<typeof insertApprovalRuleSchema>;
export type InsertApprovalStep = z.infer<typeof insertApprovalStepSchema>;
export type ApprovalRule = typeof approvalRulesTable.$inferSelect;
export type ApprovalStep = typeof approvalStepsTable.$inferSelect;
