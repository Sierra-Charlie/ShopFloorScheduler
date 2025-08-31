
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function DependencyLegend() {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <Card className="fixed bottom-4 right-4 max-w-xs shadow-lg z-40" data-testid="dependency-legend">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Sequence Codes</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold" data-testid="code-m">M</span>
              <span>Mechanical Install</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold" data-testid="code-e">E</span>
              <span>Electrical Install</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold" data-testid="code-s">S</span>
              <span>Sub-Assembly</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold" data-testid="code-p">P</span>
              <span>Pre-Assembly</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold" data-testid="code-kb">KB</span>
              <span>Kanban</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center space-x-2 text-xs">
              <AlertTriangle className="h-3 w-3 text-warning" />
              <span>Dependency conflict</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
