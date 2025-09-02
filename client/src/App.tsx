import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserProvider } from "@/contexts/user-context";
import Scheduler from "@/pages/scheduler";
import Dashboard from "@/pages/dashboard";
import GanttView from "@/pages/gantt-view";
import MaterialHandler from "@/pages/material-handler";
import AssemblerView from "@/pages/assembler-view";
import AndonIssues from "@/pages/andon-issues";
import BuildBayMap from "@/pages/build-bay-map";
import Messages from "@/pages/messages";
import NotFound from "@/pages/not-found";
import MainHeader from "@/components/main-header";

function Router() {
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
