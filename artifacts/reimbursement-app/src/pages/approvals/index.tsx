import { Layout } from "@/components/layout/Layout";
import { usePendingApprovals } from "@/hooks/use-expenses";
import { Button, Card, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "wouter";
import { CheckSquare } from "lucide-react";

export default function ApprovalsList() {
  const { data, isLoading } = usePendingApprovals();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Pending Approvals</h1>
          <p className="text-muted-foreground mt-1">Expenses waiting for your review.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1,2,3].map(i => <Card key={i} className="h-24 animate-pulse bg-muted/50" />)}
          </div>
        ) : data?.length === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CheckSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">All caught up!</h3>
              <p className="text-muted-foreground mt-1 max-w-sm">There are no expenses waiting for your approval right now.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {data?.map(expense => (
              <Card key={expense.id} className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all group">
                <div className="flex flex-col sm:flex-row p-5 sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                      {expense.submittedByName.charAt(0)}
                    </div>
                    <div>
                      <Link href={`/expenses/${expense.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                        {expense.title}
                      </Link>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{expense.submittedByName}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span>{format(new Date(expense.expenseDate), 'MMM d, yyyy')}</span>
                        <span className="w-1 h-1 rounded-full bg-border"></span>
                        <span className="capitalize">{expense.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6 border-t sm:border-t-0 pt-4 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Amount</p>
                      <p className="text-xl font-bold">{formatCurrency(expense.amount, expense.currency)}</p>
                    </div>
                    <Link href={`/expenses/${expense.id}`}>
                      <Button>Review</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
