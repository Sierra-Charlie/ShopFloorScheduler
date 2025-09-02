import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Pause, Square, ExternalLink, AlertTriangle, FileText, CheckCircle, Camera } from "lucide-react";
import { AssemblyCard } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useUpdateAssemblyCard, useAssemblyCards } from "@/hooks/use-assembly-cards";
import { cn } from "@/lib/utils";
import { CameraCapture } from "./CameraCapture";
import { apiRequest } from "@/lib/queryClient";

interface AssemblyDetailViewProps {
  card: AssemblyCard | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (card: AssemblyCard) => void;
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

export default function AssemblyDetailView({ card, isOpen, onClose, onEdit, userRole = "assembler" }: AssemblyDetailViewProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showAndonDialog, setShowAndonDialog] = useState(false);
  const [andonIssue, setAndonIssue] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const { data: assemblyCards = [] } = useAssemblyCards();
  
  // Get the current card data from the server (refreshes automatically after mutations)
  const currentCard = card ? assemblyCards.find(c => c.id === card.id) || card : null;

  // Initialize timer state based on card status when dialog opens
  useEffect(() => {
    if (isOpen && currentCard) {
      if (currentCard.status === "assembling") {
        // Card is actively being assembled
        setIsTimerRunning(true);
        if (currentCard.startTime) {
          const serverStartTime = new Date(currentCard.startTime);
          setStartTime(serverStartTime);
        }
      } else if (currentCard.status === "paused") {
        // Card is paused, show accumulated time but don't run timer
        setIsTimerRunning(false);
        setElapsedTime(currentCard.elapsedTime || 0);
      } else {
        // Reset timer state for other statuses
        setIsTimerRunning(false);
        setElapsedTime(0);
        setStartTime(null);
      }
    }
  }, [isOpen, currentCard]);

  // Timer effect - always calculate from server's startTime if available
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentCard?.status === "assembling") {
      if (currentCard.startTime) {
        // Use server's startTime
        const serverStartTime = new Date(currentCard.startTime);
        setIsTimerRunning(true);
        
        // Update elapsed time immediately
        setElapsedTime(Math.max(0, Math.floor((Date.now() - serverStartTime.getTime()) / 1000)));
        
        interval = setInterval(() => {
          setElapsedTime(Math.max(0, Math.floor((Date.now() - serverStartTime.getTime()) / 1000)));
        }, 1000);
      } else {
        // Card is assembling but no startTime yet - server is setting it
        // Use current time as fallback and let next effect update with server time
        const fallbackStart = new Date();
        setIsTimerRunning(true);
        setElapsedTime(0);
        
        interval = setInterval(() => {
          setElapsedTime(Math.max(0, Math.floor((Date.now() - fallbackStart.getTime()) / 1000)));
        }, 1000);
      }
    } else if (currentCard?.status === "paused") {
      // Show accumulated elapsed time when paused
      setIsTimerRunning(false);
      setElapsedTime(currentCard.elapsedTime || 0);
    } else if (currentCard?.status !== "assembling" && currentCard?.status !== "paused") {
      setIsTimerRunning(false);
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [currentCard?.status, currentCard?.startTime, currentCard?.elapsedTime]);

  const handleStartTimer = async () => {
    try {
      // Update card status to assembling (server will set startTime automatically)
      if (currentCard) {
        await updateCardMutation.mutateAsync({
          id: currentCard.id,
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

  const handleStopTimer = async () => {
    try {
      if (currentCard) {
        // Pause the timer by switching to paused status
        await updateCardMutation.mutateAsync({
          id: currentCard.id,
          status: "paused",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to pause assembly",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleResetTimer = async () => {
    try {
      if (currentCard) {
        await updateCardMutation.mutateAsync({
          id: currentCard.id,
          status: "ready_for_build",
          startTime: null,
        });
      }
    } catch (error) {
      toast({
        title: "Failed to reset timer",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleBuildComplete = async () => {
    try {
      const now = new Date();
      const actualDurationHours = Math.max(elapsedTime / 3600, 0.01); // Ensure minimum duration
      
      setIsTimerRunning(false);
      
      // Update card status to completed and record actual duration (keep original duration unchanged)
      if (currentCard) {
        await updateCardMutation.mutateAsync({
          id: currentCard.id,
          status: "completed",
          actualDuration: Math.max(Math.round(actualDurationHours * 100) / 100, 0.01), // Round to 2 decimal places, minimum 0.01 hour
        });
      }
      
      toast({
        title: "Assembly Complete!",
        description: `${currentCard?.cardNumber} completed in ${formatTime(elapsedTime)}`,
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
    if (currentCard) {
      // Use the gembaDocLink field if available, otherwise fallback to generated URL
      const gembaUrl = currentCard.gembaDocLink || `https://gembadocs.com/view-standard-operation/${currentCard.cardNumber.toLowerCase()}-assembly-instructions`;
      window.open(gembaUrl, '_blank');
    }
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    try {
      // Get upload URL from server
      const uploadResponse = await fetch("/api/objects/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const { uploadURL } = await uploadResponse.json();
      
      // Upload photo to object storage
      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: photoBlob,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
      
      if (uploadResult.ok) {
        setAttachedPhoto(uploadURL);
        toast({
          title: "Photo captured",
          description: "Photo attached to Andon alert",
        });
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Failed to upload photo",
        description: "Please try again",
        variant: "destructive",
      });
    }
    setShowCamera(false);
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

    let photoPath = null;
    if (attachedPhoto) {
      try {
        const response = await fetch("/api/andon-photos", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ photoURL: attachedPhoto }),
        });
        const data = await response.json();
        photoPath = data.objectPath;
      } catch (error) {
        console.error("Error saving photo:", error);
      }
    }

    try {
      // Create Andon issue in database
      const response = await fetch("/api/andon-issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assemblyCardNumber: currentCard?.cardNumber,
          description: andonIssue,
          photoPath,
          submittedBy: "Current Assembler", // In real app, get from auth
          status: "unresolved",
        }),
      });
      
      if (response.ok) {
        const createdIssue = await response.json();
        toast({
          title: "Andon Alert Sent!",
          description: `Issue ${createdIssue.issueNumber} created for ${currentCard?.cardNumber}${photoPath ? " with photo" : ""}`,
        });
      } else {
        throw new Error("Failed to create issue");
      }
      
      setShowAndonDialog(false);
      setAndonIssue("");
      setAttachedPhoto(null);
    } catch (error) {
      console.error("Error creating andon issue:", error);
      toast({
        title: "Failed to send alert",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (!currentCard) return null;

  const expectedHours = currentCard.duration || 1;
  const expectedSeconds = expectedHours * 3600;
  const isOvertime = elapsedTime > expectedSeconds;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-4 h-4 rounded",
                  currentCard.status === "ready_for_build" ? getPhaseClass(currentCard.phase) :
                  currentCard.status === "assembling" ? "bg-blue-500" :
                  currentCard.status === "completed" ? "bg-green-500" :
                  "bg-gray-400"
                )}></div>
                <span>Assembly Card {currentCard.cardNumber}</span>
                <div className="text-sm bg-black text-white px-2 py-1 rounded">
                  Phase {currentCard.phase}
                </div>
              </div>
              {onEdit && (
                <Button
                  onClick={() => {
                    onClose();
                    onEdit(currentCard);
                  }}
                  variant="outline"
                  size="sm"
                  data-testid="button-edit-properties"
                >
                  Edit Properties
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              View and manage assembly card {currentCard.cardNumber} - {currentCard.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Card Information Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Assembly Name</Label>
                <p className="font-semibold">{currentCard.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                <p className="font-semibold">{getSequenceTypeLabel(currentCard.type)}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Expected Duration</Label>
                <p className="font-semibold">{currentCard.duration} hours</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <p className={cn(
                  "font-semibold capitalize",
                  currentCard.status === "completed" ? "text-green-600" : 
                  currentCard.status === "assembling" ? "text-blue-600" :
                  currentCard.status === "paused" ? "text-orange-600" :
                  currentCard.status === "ready_for_build" ? "text-orange-600" : "text-gray-600"
                )}>
                  {currentCard.status?.replace('_', ' ')}
                </p>
              </div>
              {currentCard.dependencies && currentCard.dependencies.length > 0 && (
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Dependencies</Label>
                  <p className="font-semibold">{currentCard.dependencies.join(', ')}</p>
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
                    {currentCard.status === "completed" && currentCard.actualDuration 
                      ? formatTime(currentCard.actualDuration * 3600) // Convert hours to seconds for display
                      : formatTime(elapsedTime)
                    }
                  </div>
                </div>
                <div className="text-center">
                  <Label className="text-sm text-muted-foreground">Expected Time</Label>
                  <div className="text-2xl font-mono font-bold text-blue-600">
                    {formatTime(expectedSeconds)}
                  </div>
                </div>
              </div>

              {(isOvertime || (currentCard.status === "completed" && currentCard.actualDuration && currentCard.actualDuration * 3600 > expectedSeconds)) && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {currentCard.status === "completed" && currentCard.actualDuration 
                      ? `Assembly took ${formatTime((currentCard.actualDuration * 3600) - expectedSeconds)} over expected time`
                      : `Assembly is running ${formatTime(elapsedTime - expectedSeconds)} over expected time`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {currentCard.status !== "ready_for_build" && currentCard.status !== "assembling" && currentCard.status !== "completed" && currentCard.status !== "paused" && (
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Card must be marked "Ready for Build" by Material Handler before assembly can begin
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex space-x-2">
                {currentCard.status !== "assembling" ? (
                  <Button 
                    onClick={handleStartTimer}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={currentCard.status !== "ready_for_build" && currentCard.status !== "paused"}
                    data-testid="button-start-build"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {currentCard.status === "paused" ? "Resume Build" : "Start Build"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleStopTimer}
                    variant="destructive"
                    data-testid="button-stop-build"
                  >
                    <Pause className="mr-2 h-4 w-4" />
                    Pause Build
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
                {currentCard.status === "assembling" && (
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
              Andon Alert - {currentCard?.cardNumber}
            </DialogTitle>
            <DialogDescription>
              Report an issue or request supervisor assistance for assembly card {currentCard?.cardNumber}
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
            
            {/* Photo Attachment Section */}
            <div>
              <Label className="text-sm font-medium">Photo (Optional):</Label>
              <div className="mt-2 space-y-2">
                {attachedPhoto ? (
                  <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                    <span className="text-sm text-green-700">Photo attached</span>
                    <Button
                      onClick={() => setAttachedPhoto(null)}
                      variant="outline"
                      size="sm"
                      data-testid="button-remove-photo"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowCamera(true)}
                    variant="outline"
                    className="w-full"
                    data-testid="button-take-photo"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Take Photo
                  </Button>
                )}
              </div>
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
      
      {/* Camera Dialog */}
      {showCamera && (
        <CameraCapture
          onPhotoCapture={handlePhotoCapture}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </>
  );
}