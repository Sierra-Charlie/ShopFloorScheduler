import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Package, Users, BarChart3, Settings } from "lucide-react";
import { useUser, canAccess } from "@/contexts/user-context";
import UserRoleSelector from "@/components/user-role-selector";
import { cn } from "@/lib/utils";

export default function MainHeader() {
  const [location] = useLocation();
  const { currentUser } = useUser();

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
    }
  ];

  const allowedNavItems = navigationItems.filter(item => 
    canAccess(currentUser, item.permission)
  );

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Shop Floor Scheduler</h1>
          </div>
          
          <Separator orientation="vertical" className="h-6" />
          
          <nav className="flex items-center space-x-1">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || 
                (item.href === "/" && location === "/") ||
                (item.href === "/gantt" && location === "/");
              
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
        
        <UserRoleSelector />
      </div>
    </header>
  );
}