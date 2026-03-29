import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, Receipt, CheckSquare, 
  Users, Settings, LogOut, ShieldCheck
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
    { name: "Expenses", href: "/expenses", icon: Receipt, roles: ["admin", "manager", "employee"] },
    { name: "Approvals", href: "/approvals", icon: CheckSquare, roles: ["admin", "manager"] },
    { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
    { name: "Approval Rules", href: "/approval-rules", icon: ShieldCheck, roles: ["admin"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card shadow-sm">
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2 text-primary font-display font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center">
            R
          </div>
          Reimbursify
        </div>
      </div>
      
      <div className="flex-1 overflow-auto py-6">
        <nav className="space-y-1 px-4">
          {allowedItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-sm" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-secondary/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium">{user.firstName} {user.lastName}</span>
            <span className="truncate text-xs text-muted-foreground capitalize">{user.role}</span>
          </div>
          <button 
            onClick={() => logout()}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
