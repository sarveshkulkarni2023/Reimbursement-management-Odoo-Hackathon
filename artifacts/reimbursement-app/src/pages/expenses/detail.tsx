import { Layout } from "@/components/layout/Layout";
import { useExpense, useApproveExpense, useRejectExpense } from "@/hooks/use-expenses";
import { useAuth } from "@/hooks/use-auth";
import { useParams, Link } from "wouter";
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Textarea } from "@/components/ui";
import { formatCurrency, cn } from "@/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Check } from "lucide-react";
import { useState } from "react";

export default function ExpenseDetail() {
  const { id } = useParams();
  const expenseId = parseInt(id || "0");
  const { data: expense, isLoading } = useExpense(expenseId);
  const { user } = useAuth();
  const approveMutation = useApproveExpense();
  const rejectMutation = useRejectExpense();
  const [comment, setComment] = useState("");

  if (isLoading || !expense) {
    return <Layout><div className="flex justify-center p-12"><Clock className="animate-spin text-muted-foreground" /></div></Layout>;
  }

  // Check if current user needs to approve this
  const pendingAction = expense.approvalHistory.find(a => a.approverId === user?.id && a.action === "pending");
  const canAct = !!pendingAction || user?.role === "admin";

  const handleApprove = () => approveMutation.mutate({ id: expenseId, data: { comment } });
  const handleReject = () => rejectMutation.mutate({ id: expenseId, data: { comment } });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <Link href="/expenses" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to expenses
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">{expense.title}</h1>
              <p className="text-muted-foreground mt-1">Submitted by {expense.submittedByName} on {format(new Date(expense.createdAt), 'MMM d, yyyy')}</p>
            </div>
            <Badge variant={
              expense.status === 'approved' ? 'success' : 
              expense.status === 'rejected' ? 'destructive' : 
              expense.status === 'cancelled' ? 'secondary' : 'warning'
            } className="text-sm px-3 py-1">
              {expense.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-4">
                <CardTitle className="text-lg">Expense Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(parseFloat(String(expense.amount)), expense.currency)}</p>
                    {expense.amountInCompanyCurrency && expense.currency !== expense.companyCurrency && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ≈ {formatCurrency(parseFloat(String(expense.amountInCompanyCurrency)), expense.companyCurrency!)}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium mt-1">{format(new Date(expense.expenseDate), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium mt-1 capitalize">{expense.category.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID</p>
                    <p className="font-medium mt-1 font-mono text-sm">EXP-{expense.id.toString().padStart(5, '0')}</p>
                  </div>
                  {expense.description && (
                    <div className="col-span-2 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="mt-2 text-sm">{expense.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {expense.receiptUrl && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-muted-foreground" /> Receipt Attached</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-dashed">
                    <p className="text-muted-foreground text-sm">Receipt viewer (Mock)</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Approvals */}
          <div className="space-y-6">
            {expense.status === "pending" && canAct && (
              <Card className="border-primary bg-primary/5 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-primary">Your Action Required</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Add a comment (optional)..." 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" className="flex-1" onClick={handleReject} isLoading={rejectMutation.isPending}>Reject</Button>
                    <Button className="flex-1" onClick={handleApprove} isLoading={approveMutation.isPending}>Approve</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Approval Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {/* Submitted step */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-secondary text-secondary-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10">
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border shadow-sm rounded-xl p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-sm">Submitted</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{expense.submittedByName}</p>
                    </div>
                  </div>

                  {/* Dynamic steps */}
                  {expense.approvalHistory.map((action, i) => (
                    <div key={action.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10",
                        action.action === 'approved' ? "bg-emerald-500 text-white" :
                        action.action === 'rejected' ? "bg-rose-500 text-white" :
                        "bg-amber-500 text-white"
                      )}>
                        {action.action === 'approved' ? <CheckCircle className="w-5 h-5" /> :
                         action.action === 'rejected' ? <XCircle className="w-5 h-5" /> :
                         <Clock className="w-5 h-5" />}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border shadow-sm rounded-xl p-4">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-sm capitalize">{action.action}</h4>
                          {action.actionAt && <span className="text-[10px] text-muted-foreground">{format(new Date(action.actionAt), 'MMM d')}</span>}
                        </div>
                        <p className="text-xs font-medium">{action.approverName} <span className="text-muted-foreground font-normal">({action.approverRole})</span></p>
                        {action.comment && <p className="text-xs mt-2 p-2 bg-muted/50 rounded italic">"{action.comment}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
