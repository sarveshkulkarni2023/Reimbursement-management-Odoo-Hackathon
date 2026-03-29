import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Receipt, Clock, CheckCircle, XCircle, TrendingUp, ArrowRight, AlertCircle
} from "lucide-react";

interface DashboardStats {
  totalExpenses: number;
  pendingExpenses: number;
  approvedExpenses: number;
  rejectedExpenses: number;
  totalAmountPending: number;
  totalAmountApproved: number;
  expensesByCategory: { category: string; count: number; total: number }[];
  recentExpenses: any[];
  pendingApprovals: number;
}

const CATEGORY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#F97316", "#84CC16", "#EC4899", "#6B7280",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
};

function StatCard({
  title, value, subtitle, icon: Icon, color, link
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  link?: string;
}) {
  const content = (
    <Card className="p-6 hover:shadow-md transition-shadow cursor-default">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {link && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link href={link} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
            View details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </Card>
  );
  return content;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/analytics/dashboard"),
  });

  const currency = user?.company?.currency || "USD";
  const currencySymbol = user?.company?.currencySymbol || "$";

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome, {user?.firstName}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.company?.name} — {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          {(user?.role === "manager" || user?.role === "admin") && (stats?.pendingApprovals || 0) > 0 && (
            <Link href="/approvals">
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-yellow-100 transition-colors">
                <AlertCircle className="h-4 w-4" />
                {stats?.pendingApprovals} approval{stats?.pendingApprovals !== 1 ? "s" : ""} waiting
              </div>
            </Link>
          )}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Expenses"
            value={stats?.totalExpenses || 0}
            subtitle="All time"
            icon={Receipt}
            color="bg-blue-500"
            link="/expenses"
          />
          <StatCard
            title="Pending"
            value={stats?.pendingExpenses || 0}
            subtitle={`${currencySymbol}${formatCurrency(stats?.totalAmountPending || 0)}`}
            icon={Clock}
            color="bg-yellow-500"
            link="/expenses?status=pending"
          />
          <StatCard
            title="Approved"
            value={stats?.approvedExpenses || 0}
            subtitle={`${currencySymbol}${formatCurrency(stats?.totalAmountApproved || 0)}`}
            icon={CheckCircle}
            color="bg-green-500"
            link="/expenses?status=approved"
          />
          <StatCard
            title="Rejected"
            value={stats?.rejectedExpenses || 0}
            subtitle="Need attention"
            icon={XCircle}
            color="bg-red-500"
            link="/expenses?status=rejected"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Expenses by Category</h2>
            </div>
            {stats?.expensesByCategory && stats.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.expensesByCategory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.replace("_", " ")}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      name === "total" ? `${currencySymbol}${formatCurrency(Number(value))}` : value,
                      name === "total" ? "Amount" : "Count"
                    ]}
                    labelFormatter={(label) => label.replace("_", " ")}
                  />
                  <Bar dataKey="count" fill="#3B82F6" name="count" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No expense data yet
              </div>
            )}
          </Card>

          {/* Pie Chart */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Spend Distribution</h2>
            </div>
            {stats?.expensesByCategory && stats.expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={stats.expensesByCategory.filter(c => c.total > 0)}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ category, percent }) => `${category.replace("_", " ")} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.expensesByCategory.map((_, index) => (
                      <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `${currencySymbol}${formatCurrency(Number(value))}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No spend data yet
              </div>
            )}
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Expenses</h2>
            <Link href="/expenses" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {stats?.recentExpenses && stats.recentExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border">
                    <th className="pb-3 font-medium text-muted-foreground">Title</th>
                    <th className="pb-3 font-medium text-muted-foreground">Category</th>
                    <th className="pb-3 font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <Link href={`/expenses/${expense.id}`} className="font-medium hover:text-primary transition-colors">
                          {expense.title}
                        </Link>
                        {user?.role !== "employee" && (
                          <p className="text-xs text-muted-foreground">{expense.submittedByName}</p>
                        )}
                      </td>
                      <td className="py-3 pr-4 capitalize text-muted-foreground">
                        {expense.category?.replace("_", " ")}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {expense.currency} {formatCurrency(parseFloat(expense.amount))}
                        {expense.companyCurrency && expense.companyCurrency !== expense.currency && (
                          <p className="text-xs text-muted-foreground">
                            ≈ {expense.companyCurrency} {formatCurrency(parseFloat(expense.amountInCompanyCurrency || "0"))}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {expense.expenseDate ? format(new Date(expense.expenseDate), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[expense.status] || "bg-gray-100 text-gray-600"}`}>
                          {expense.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No expenses yet. <Link href="/expenses/new" className="text-primary hover:underline">Submit your first expense</Link></p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
