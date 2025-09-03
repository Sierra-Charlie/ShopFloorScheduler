import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Package, Users, BarChart3, Settings, AlertTriangle, PieChart, Map, MessageCircle, LogOut, User, Shield } from "lucide-react";
import { useUser, canAccess } from "@/contexts/user-context";
import UserRoleSelector from "@/components/user-role-selector";
import { cn } from "@/lib/utils";
import vikingLogo from "@assets/Viking-logo-2_1756777299359.jpg";

export default function MainHeader() {
  const [location] = useLocation();
  const { currentUser, logout } = useUser();

  if (!currentUser) {
    return null;
  }

  const navigationItems = [
    {
      href: "/",
      label: "Schedule View",
      icon: Calendar,
      permission: "schedule_view"
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: PieChart,
      permission: "dashboard"
    },
    {
      href: "/gantt",
      label: "Gantt View",
      icon: BarChart3,
      permission: "gantt_view"
    },
    {
      href: "/material-handler",
      label: "Material Handler",
      icon: Package,
      permission: "material_handler_view"
    },
    {
      href: "/assembler",
      label: "Assembler View",
      icon: Users,
      permission: "assembler_view"
    },
    {
      href: "/andon-issues",
      label: "Andon Issues",
      icon: AlertTriangle,
      permission: "andon_issues_view"
    },
    {
      href: "/build-bay-map",
      label: "505 Build Bay Map",
      icon: Map,
      permission: "schedule_view"
    },
    {
      href: "/messages",
      label: "Kaizen Ideas",
      icon: MessageCircle,
      permission: "messages_view"
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Shield,
      permission: "admin"
    }
  ];

  const allowedNavItems = navigationItems.filter(item => 
    canAccess(currentUser, item.permission)
  );

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <img src={vikingLogo} alt="Viking Logo" className="h-6 w-6 object-contain" />
            <h1 className="text-xl font-semibold">Viking's Shop Floor Scheduler</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <UserRoleSelector />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="button-user-menu">
                  <User className="h-4 w-4 mr-2" />
                  {currentUser.name}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={logout} data-testid="button-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <nav className="flex items-center space-x-1">
          {allowedNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "flex items-center space-x-2",
                    isActive && "bg-primary text-primary-foreground"
                  )}
                  data-testid={`nav-${item.href.replace("/", "") || "home"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}