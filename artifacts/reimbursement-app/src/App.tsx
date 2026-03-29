import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";

// Pages
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Dashboard from "@/pages/dashboard";
import ExpensesList from "@/pages/expenses/index";
import NewExpense from "@/pages/expenses/new";
import ExpenseDetail from "@/pages/expenses/detail";
import ApprovalsList from "@/pages/approvals/index";
import UsersList from "@/pages/users/index";
import ApprovalRules from "@/pages/approval-rules/index";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
});

function ProtectedRoute({ component: Component, roles }: { component: any, roles?: string[] }) {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Redirect to="/" />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      
      <Route path="/expenses">
        {() => <ProtectedRoute component={ExpensesList} />}
      </Route>
      <Route path="/expenses/new">
        {() => <ProtectedRoute component={NewExpense} />}
      </Route>
      <Route path="/expenses/:id">
        {() => <ProtectedRoute component={ExpenseDetail} />}
      </Route>
      
      <Route path="/approvals">
        {() => <ProtectedRoute component={ApprovalsList} roles={["admin", "manager"]} />}
      </Route>
      
      <Route path="/users">
        {() => <ProtectedRoute component={UsersList} roles={["admin"]} />}
      </Route>
      
      <Route path="/approval-rules">
        {() => <ProtectedRoute component={ApprovalRules} roles={["admin"]} />}
      </Route>

      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} roles={["admin"]} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
