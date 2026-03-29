import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useExpenses } from "@/hooks/use-expenses";
import { Button, Card, Badge } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "wouter";
import { Plus, Search, Filter } from "lucide-react";

export default function ExpensesList() {
  const [status, setStatus] = useState<string>("all");
  const { data, isLoading } = useExpenses({ status: status !== "all" ? status : undefined });

  const statusColors = {
    pending: "warning",
    approved: "success",
    rejected: "destructive",
    cancelled: "secondary"
  } as const;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground mt-1">Manage and track your reimbursement claims.</p>
          </div>
          <Link href="/expenses/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Expense
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0">
          {["all", "pending", "approved", "rejected", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                status === s 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden border-border/50 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Expense Details</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Submitter</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-3/4"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-1/2"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-1/2"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-muted rounded w-2/3"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-muted rounded-full w-20"></div></td>
                    </tr>
                  ))
                ) : data?.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No expenses found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  data?.expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4">
                        <Link href={`/expenses/${expense.id}`} className="block">
                          <div className="font-medium text-foreground group-hover:text-primary transition-colors">{expense.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize px-2.5 py-1 bg-secondary rounded-md text-xs font-medium text-secondary-foreground">
                          {expense.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {expense.submittedByName}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusColors[expense.status as keyof typeof statusColors]}>
                          {expense.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
