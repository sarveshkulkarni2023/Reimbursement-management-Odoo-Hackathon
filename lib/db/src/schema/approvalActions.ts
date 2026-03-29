import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { expensesTable } from "./expenses";
import { usersTable } from "./users";

export const approvalActionEnum = pgEnum("approval_action", ["pending", "approved", "rejected"]);

export const approvalActionsTable = pgTable("approval_actions", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expensesTable.id, { onDelete: "cascade" }),
  approverId: integer("approver_id").notNull().references(() => usersTable.id),
  stepNumber: integer("step_number").notNull(),
  action: approvalActionEnum("action").notNull().default("pending"),
  comment: text("comment"),
  actionAt: timestamp("action_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApprovalActionSchema = createInsertSchema(approvalActionsTable).omit({ id: true, createdAt: true });
export type InsertApprovalAction = z.infer<typeof insertApprovalActionSchema>;
export type ApprovalAction = typeof approvalActionsTable.$inferSelect;
