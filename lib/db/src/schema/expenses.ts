import { pgTable, serial, text, timestamp, boolean, integer, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { companiesTable } from "./companies";

export const expenseCategoryEnum = pgEnum("expense_category", [
  "travel", "meals", "accommodation", "office_supplies", "software",
  "training", "medical", "entertainment", "utilities", "other"
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "pending", "approved", "rejected", "cancelled"
]);

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  amountInCompanyCurrency: numeric("amount_in_company_currency", { precision: 14, scale: 2 }),
  companyCurrency: text("company_currency"),
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 6 }),
  category: expenseCategoryEnum("category").notNull(),
  expenseDate: date("expense_date").notNull(),
  receiptUrl: text("receipt_url"),
  status: expenseStatusEnum("status").notNull().default("pending"),
  submittedById: integer("submitted_by_id").notNull().references(() => usersTable.id),
  companyId: integer("company_id").notNull().references(() => companiesTable.id),
  approvalRuleId: integer("approval_rule_id"),
  currentApprovalStep: integer("current_approval_step").default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
