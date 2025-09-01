import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Pause, Square, ExternalLink, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import { AssemblyCard } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { cn } from "@/lib/utils";

interface AssemblyDetailViewProps {
  card: AssemblyCard | null;
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const getPhaseClass = (phase: number) => {
  switch (phase) {
    case 1: return "phase-1";
    case 2: return "phase-2";
    case 3: return "phase-3";
    case 4: return "phase-4";
    default: return "phase-1";
  }
};

const getSequenceTypeLabel = (type: string) => {
  switch (type) {
    case "M": return "Mechanical Install";
    case "E": return "Electrical Install";
    case "S": return "Sub-Assembly";
    case "P": return "Pre-Assembly";
    case "KB": return "Kanban";
    default: return type;
  }
};

export default function AssemblyDetailView({ card, isOpen, onClose, userRole = "assembler" }: AssemblyDetailViewProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showAndonDialog, setShowAndonDialog] = useState(false);
  const [andonIssue, setAndonIssue] = useState("");
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();

  // Initialize timer state based on card status when dialog opens
  useEffect(() => {
    if (isOpen && card) {
      if (card.status === "assembling" && card.startTime) {
        // Card is already being assembled, restore timer state
        const startTime = new Date(card.startTime);
        const now = new Date();
        const elapsed = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
        setStartTime(startTime);
        setElapsedTime(elapsed);
        setIsTimerRunning(true);
      } else {
        // Reset timer state for non-assembling cards
        setIsTimerRunning(false);
        setElapsedTime(0);
        setStartTime(null);
      }
    }
  }, [isOpen, card]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000)));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, startTime]);

  const handleStartTimer = async () => {
    try {
      // If there's already elapsed time, calculate the new start time to continue from where we left off
      const now = new Date();
      const adjustedStartTime = elapsedTime > 0 ? new Date(now.getTime() - (elapsedTime * 1000)) : now;
      setStartTime(adjustedStartTime);
      setIsTimerRunning(true);
      
      // Update card status to assembling (server will set startTime automatically)
      if (card) {
        await updateCardMutation.mutateAsync({
          id: card.id,
          status: "assembling",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to start assembly",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setElapsedTime(0);
    setStartTime(null);
  };

  const handleBuildComplete = async () => {
    try {
      const now = new Date();
      const actualDurationHours = Math.max(elapsedTime / 3600, 0.01); // Ensure minimum duration
      
      setIsTimerRunning(false);
      
      // Update card status to completed and record duration
      if (card) {
        await updateCardMutation.mutateAsync({
          id: card.id,
          status: "completed",
          duration: Math.max(Math.round(actualDurationHours * 100) / 100, 1), // Round to 2 decimal places, minimum 1 hour
        });
      }
      
      toast({
        title: "Assembly Complete!",
        description: `${card?.cardNumber} completed in ${formatTime(elapsedTime)}`,
      });
    } catch (error) {
      toast({
        title: "Failed to complete assembly",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGembaDocClick = () => {
    if (card) {
      // Generate Gemba doc URL based on card number
      const gembaUrl = `https://gembadocs.com/view-standard-operation/${card.cardNumber.toLowerCase()}-assembly-instructions`;
      window.open(gembaUrl, '_blank');
    }
  };

  const handleAndonAlert = async () => {
    if (!andonIssue.trim()) {
      toast({
        title: "Please describe the issue",
        description: "Enter details about the problem before sending alert",
        variant: "destructive",
      });
      return;
    }

    try {
      // In a real app, this would send an alert to supervisors
      toast({
        title: "Andon Alert Sent",
        description: `Production supervisor notified about issue with ${card?.cardNumber}`,
      });
      setShowAndonDialog(false);
      setAndonIssue("");
    } catch (error) {
      toast({
        title: "Failed to send alert",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (!card) return null;

  const expectedHours = card.duration || 1;
  const expectedSeconds = expectedHours * 3600;
  const isOvertime = elapsedTime > expectedSeconds;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-3">
              <div className={cn(
                "w-4 h-4 rounded",
                card.status === "ready_for_build" ? getPhaseClass(card.phase) :
                card.status === "assembling" ? "bg-blue-500" :
                card.status === "completed" ? "bg-green-500" :
                "bg-gray-400"
              )}></div>
              <span>Assembly Card {card.cardNumber}</span>
              <div className="text-sm bg-black text-white px-2 py-1 rounded">
                Phase {card.phase}
              </div>
            </DialogTitle>
            <DialogDescription>
              View and manage assembly card {card.cardNumber} - {card.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Card Information Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Assembly Name</Label>
                <p className="font-semibold">{card.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                <p className="font-semibold">{getSequenceTypeLabel(card.type)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Expected Duration</Label>
                <p className="font-semibold">{card.duration} hours</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <p className="font-semibold capitalize">{card.status?.replace('_', ' ')}</p>
              </div>
              {card.dependencies && card.dependencies.length > 0 && (
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Dependencies</Label>
                  <p className="font-semibold">{card.dependencies.join(', ')}</p>
                </div>
              )}
            </div>

            {/* Timer Section */}
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center">
                <Play className="mr-2 h-4 w-4" />
                Assembly Timer
              </h3>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <Label className="text-sm text-muted-foreground">Actual Time</Label>
                  <div className={cn(
                    "text-2xl font-mono font-bold",
                    isOvertime ? "text-red-600" : "text-green-600"
                  )}>
                    {formatTime(elapsedTime)}
                  </div>
                </div>
                <div className="text-center">
                  <Label className="text-sm text-muted-foreground">Expected Time</Label>
                  <div className="text-2xl font-mono font-bold text-blue-600">
                    {formatTime(expectedSeconds)}
                  </div>
                </div>
              </div>

              {isOvertime && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Assembly is running {formatTime(elapsedTime - expectedSeconds)} over expected time
                  </AlertDescription>
                </Alert>
              )}

              {card.status !== "ready_for_build" && card.status !== "assembling" && card.status !== "completed" && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Card must be marked "Ready for Build" by Material Handler before assembly can begin
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                {card.status !== "assembling" && !isTimerRunning ? (
                  <Button 
                    onClick={handleStartTimer}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={card.status !== "ready_for_build"}
                    data-testid="button-start-build"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start Build
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopTimer}
                    variant="destructive"
                    data-testid="button-stop-build"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Stop Build
                  </Button>
                )}
                <Button 
                  onClick={handleResetTimer}
                  variant="outline"
                  data-testid="button-reset-timer"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                {(isTimerRunning || elapsedTime > 0) && card.status !== "completed" && (
                  <Button 
                    onClick={handleBuildComplete}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-build-complete"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Build Complete
                  </Button>
                )}
              </div>
            </div>

            {/* Gemba Docs Section */}
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Work Instructions
              </h3>
              <Button 
                onClick={handleGembaDocClick}
                className="w-full"
                variant="outline"
                data-testid="button-gemba-docs"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Gemba Doc Work Instructions
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Click to open detailed assembly instructions in a new window
              </p>
            </div>

            {/* Andon Alert Section */}
            <div className="p-4 border border-border rounded-lg">
              <h3 className="font-semibold mb-4 flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Need Help?
              </h3>
              <Button 
                onClick={() => setShowAndonDialog(true)}
                variant="destructive"
                className="w-full"
                data-testid="button-andon-alert"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Andon Alert - Request Supervisor Help
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Press this button to alert the production supervisor of any issues
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Andon Issue Dialog */}
      <Dialog open={showAndonDialog} onOpenChange={setShowAndonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Andon Alert - {card.cardNumber}
            </DialogTitle>
            <DialogDescription>
              Report an issue or request supervisor assistance for assembly card {card.cardNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="andon-issue" className="text-sm font-medium">
                Describe the issue or problem:
              </Label>
              <Textarea
                id="andon-issue"
                placeholder="Please describe what help you need or what problem you're experiencing..."
                value={andonIssue}
                onChange={(e) => setAndonIssue(e.target.value)}
                className="mt-2"
                rows={4}
                data-testid="textarea-andon-issue"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleAndonAlert}
                variant="destructive"
                className="flex-1"
                data-testid="button-send-andon"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Send Alert to Supervisor
              </Button>
              <Button 
                onClick={() => setShowAndonDialog(false)}
                variant="outline"
                data-testid="button-cancel-andon"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}