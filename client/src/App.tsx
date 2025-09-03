import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserProvider, useUser } from "@/contexts/user-context";
import Scheduler from "@/pages/scheduler";
import Dashboard from "@/pages/dashboard";
import GanttView from "@/pages/gantt-view";
import MaterialHandler from "@/pages/material-handler";
import AssemblerView from "@/pages/assembler-view";
import AndonIssues from "@/pages/andon-issues";
import BuildBayMap from "@/pages/build-bay-map";
import Messages from "@/pages/messages";
import LoginPage from "@/pages/login";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import MainHeader from "@/components/main-header";

function Router() {
  const { isAuthenticated, isLoading, login } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mx-auto"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={login} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      <main>
        <Switch>
          <Route path="/" component={Scheduler} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/gantt" component={GanttView} />
          <Route path="/material-handler" component={MaterialHandler} />
          <Route path="/assembler" component={AssemblerView} />
          <Route path="/andon-issues" component={AndonIssues} />
          <Route path="/build-bay-map" component={BuildBayMap} />
          <Route path="/messages" component={Messages} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  const isMobile = useIsMobile();
  
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </DndProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}

export default App;
