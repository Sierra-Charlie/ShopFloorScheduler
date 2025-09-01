import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { useIsMobile } from "@/hooks/use-mobile";
import Scheduler from "@/pages/scheduler";
import MaterialHandler from "@/pages/material-handler";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Scheduler} />
      <Route path="/material-handler" component={MaterialHandler} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const isMobile = useIsMobile();
  
  return (
    <QueryClientProvider client={queryClient}>
      <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </DndProvider>
    </QueryClientProvider>
  );
}

export default App;
