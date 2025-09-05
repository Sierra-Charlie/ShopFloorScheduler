import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, ArrowLeft, AlertTriangle, Camera, UserCheck } from "lucide-react";
import { useAssemblyCards, useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useUser, canAccess } from "@/contexts/user-context";
import { useUsers } from "@/hooks/use-users";
import { useToast } from "@/hooks/use-toast";
import { useSetting, useUpsertSetting, useCalculatePickDueDates } from "@/hooks/use-settings";
import { useDrop, useDrag } from "react-dnd";
import { AssemblyCard } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CameraCapture } from "@/components/CameraCapture";

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

interface MaterialCardProps {
  card: AssemblyCard;
  index: number;
  onStatusChange: (cardId: string) => void;
}

function MaterialCard({ card, index, onStatusChange }: MaterialCardProps) {
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const { data: users = [] } = useUsers();
  const [pickingElapsed, setPickingElapsed] = useState(0);
  const [showAndonDialog, setShowAndonDialog] = useState(false);
  const [andonIssue, setAndonIssue] = useState("");
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Filter users to only show material handlers
  const materialHandlers = users.filter(user => user.role === "material_handler");
  
  // Find the assigned material handler
  const assignedMaterialHandler = card.assignedMaterialHandler 
    ? users.find(user => user.id === card.assignedMaterialHandler)
    : null;

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "material-card",
    item: { id: card.id, originalIndex: index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [card.id, index]);

  const isReady = card.status === "ready_for_build";
  const isPicking = card.status === "picking";
  const isDeliveredToPaint = card.status === "delivered_to_paint";
  const isClearedForPicking = card.status === "cleared_for_picking";
  
  // Check if card is overdue (today's date is past the pick due date)
  const isOverdue = card.pickDueDate && new Date() > new Date(card.pickDueDate);
  // Cards should only get phase colors when actively picking, delivered to paint, or ready for build
  const phaseClass = isReady ? getPhaseClass(card.phase) : isPicking ? getPhaseClass(card.phase) : isDeliveredToPaint ? getPhaseClass(card.phase) : "bg-gray-400";

  // Timer for picking status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPicking && card.pickingStartTime) {
      const startTime = new Date(card.pickingStartTime);
      // Update immediately
      setPickingElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      
      interval = setInterval(() => {
        setPickingElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPicking, card.pickingStartTime]);

  const handleStartPicking = async () => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        status: "picking",
      });
      onStatusChange(card.id);
      toast({
        title: "Picking started",
        description: `Started picking materials for ${card.cardNumber}`,
      });
    } catch (error) {
      toast({
        title: "Failed to start picking",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDeliveredToPaint = async () => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        status: "delivered_to_paint",
      });
      onStatusChange(card.id);
      toast({
        title: "Status updated",
        description: `${card.cardNumber} delivered to paint`,
      });
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleReadyForBuild = async () => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        status: "ready_for_build",
      });
      onStatusChange(card.id);
      toast({
        title: "Status updated",
        description: `${card.cardNumber} is now ready for build`,
      });
    } catch (error) {
      toast({
        title: "Failed to update status",
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

  const handlePhotoCapture = async (photoBlob: Blob) => {
    try {
      // Get upload URL
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

  const handleMaterialHandlerAssignment = async (materialHandlerId: string | null) => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        assignedMaterialHandler: materialHandlerId === "unassigned" ? null : materialHandlerId,
      });
      
      const handlerName = materialHandlerId === "unassigned" || !materialHandlerId 
        ? "Unassigned" 
        : materialHandlers.find(h => h.id === materialHandlerId)?.name || "Unknown";
      
      toast({
        title: "Material Handler Updated",
        description: `${card.cardNumber} assigned to ${handlerName}`,
      });
    } catch (error) {
      toast({
        title: "Failed to assign material handler",
        description: "Please try again",
        variant: "destructive",
      });
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
          assemblyCardNumber: card.cardNumber,
          issueType: "General",
          priority: "medium",
          reporterName: "Material Handler",
          description: andonIssue,
          photoPath,
          submittedBy: "Material Handler", // In real app, get from auth
          status: "unresolved",
        }),
      });
      
      if (response.ok) {
        const createdIssue = await response.json();
        toast({
          title: "Andon Alert Sent!",
          description: `Issue ${createdIssue.issueNumber} created for ${card.cardNumber}${photoPath ? " with photo" : ""}`,
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

  return (
    <div
      ref={drag}
      className={cn(
        "material-card p-4 rounded-lg border border-black shadow-sm cursor-grab active:cursor-grabbing",
        phaseClass,
        isDragging && "opacity-50",
        isOverdue && "border-red-500 border-2"
      )}
      data-testid={`material-card-${card.cardNumber}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">{card.cardNumber}</span>
          {isPicking && (
            <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg">
              P
            </div>
          )}
          {isClearedForPicking && (
            <div className="bg-white text-black rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg border-2 border-black">
              P
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm" data-testid={`text-pick-due-date-${card.cardNumber}`}>
            {card.pickDueDate ? new Date(card.pickDueDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'numeric', 
              day: 'numeric', 
              year: 'numeric' 
            }) : 'Not calculated'}
          </div>
          <div className="text-xs bg-black text-white px-2 py-1 rounded">
            {card.phase}-{card.priority || "B"}
          </div>
        </div>
      </div>
      <div className="text-sm mb-2" title={getSequenceTypeLabel(card.type)}>
        {card.name}
      </div>
      <div className="text-xs mb-3 text-gray-700">
        {card.duration} hrs • {getSequenceTypeLabel(card.type)}
      </div>

      {/* Material Handler Assignment Dropdown */}
      <div className="mb-3">
        <Label className="text-xs text-gray-600 mb-1 block">Assigned Material Handler:</Label>
        <Select
          value={card.assignedMaterialHandler || "unassigned"}
          onValueChange={handleMaterialHandlerAssignment}
          disabled={updateCardMutation.isPending}
        >
          <SelectTrigger 
            className="w-full h-8 text-xs"
            data-testid={`select-material-handler-${card.cardNumber}`}
          >
            <div className="flex items-center">
              <UserCheck className="mr-2 h-3 w-3" />
              <SelectValue placeholder="Select handler..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned" data-testid={`option-unassigned-${card.cardNumber}`}>
              <span className="text-gray-500">Unassigned</span>
            </SelectItem>
            {materialHandlers.map((handler) => (
              <SelectItem 
                key={handler.id} 
                value={handler.id}
                data-testid={`option-handler-${handler.id}-${card.cardNumber}`}
              >
                {handler.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignedMaterialHandler && (
          <div className="text-xs text-green-600 mt-1 flex items-center">
            <UserCheck className="mr-1 h-3 w-3" />
            Assigned to {assignedMaterialHandler.name}
          </div>
        )}
      </div>
      
      {isPicking && (
        <div className="text-center mb-3">
          <div className="text-sm font-medium text-green-800">Picking in progress</div>
          <div className="text-lg font-mono font-bold text-green-600">
            {formatTime(pickingElapsed)}
          </div>
        </div>
      )}
      
      {isClearedForPicking && (
        <Button
          onClick={handleStartPicking}
          size="sm"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          data-testid={`button-picking-${card.cardNumber}`}
        >
          <Package className="mr-2 h-4 w-4" />
          Start Picking
        </Button>
      )}
      
      {!isClearedForPicking && !isPicking && !isReady && !isDeliveredToPaint && card.status !== "completed" && card.status !== "assembling" && (
        <div className="text-center text-sm font-medium text-orange-800 p-2 bg-orange-50 rounded">
          ⏳ Waiting for Planning Clearance
        </div>
      )}
      
      {isPicking && (
        <div className="space-y-2">
          <Button
            onClick={handleDeliveredToPaint}
            size="sm"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            data-testid={`button-delivered-paint-${card.cardNumber}`}
          >
            <Package className="mr-2 h-4 w-4" />
            Delivered to Paint
          </Button>
          <Button
            onClick={handleReadyForBuild}
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            data-testid={`button-ready-${card.cardNumber}`}
          >
            <Package className="mr-2 h-4 w-4" />
            Ready for Build
          </Button>
        </div>
      )}
      
      {isDeliveredToPaint && (
        <Button
          onClick={handleReadyForBuild}
          size="sm"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          data-testid={`button-ready-${card.cardNumber}`}
        >
          <Package className="mr-2 h-4 w-4" />
          Ready for Build
        </Button>
      )}
      
      {isReady && (
        <div className="text-center text-sm font-medium text-green-800">
          ✓ Ready for Build
        </div>
      )}

      {/* Andon Alert Button */}
      <div className="mt-2">
        <Button
          onClick={() => setShowAndonDialog(true)}
          variant="destructive"
          size="sm"
          className="w-full"
          data-testid={`button-andon-alert-${card.cardNumber}`}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Andon Alert
        </Button>
      </div>

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
              <Label htmlFor={`andon-issue-${card.id}`} className="text-sm font-medium">
                Describe the issue or problem:
              </Label>
              <Textarea
                id={`andon-issue-${card.id}`}
                placeholder="Please describe what help you need or what problem you're experiencing..."
                value={andonIssue}
                onChange={(e) => setAndonIssue(e.target.value)}
                className="mt-2"
                rows={4}
                data-testid={`textarea-andon-issue-${card.cardNumber}`}
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
                      data-testid={`button-remove-photo-${card.cardNumber}`}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowCamera(true)}
                    variant="outline"
                    className="w-full"
                    data-testid={`button-take-photo-${card.cardNumber}`}
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
                data-testid={`button-send-andon-${card.cardNumber}`}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Send Alert to Supervisor
              </Button>
              <Button 
                onClick={() => setShowAndonDialog(false)}
                variant="outline"
                data-testid={`button-cancel-andon-${card.cardNumber}`}
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
    </div>
  );
}

interface DropZoneProps {
  onDrop: (draggedId: string, hoverIndex: number) => void;
  index: number;
  children: React.ReactNode;
}

function DropZone({ onDrop, index, children }: DropZoneProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "material-card",
    drop: (item: { id: string; originalIndex: number }) => {
      if (item.originalIndex !== index) {
        onDrop(item.id, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [index, onDrop]);

  return (
    <div
      ref={drop}
      className={cn(
        "transition-colors duration-200",
        isOver && "bg-blue-50 border-blue-300 border-2 border-dashed rounded-lg"
      )}
    >
      {children}
    </div>
  );
}

export default function MaterialHandler() {
  const { currentUser } = useUser();
  const { data: assemblyCards = [], isLoading } = useAssemblyCards();
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  
  // Settings hooks for Pick Lead Time and Daily Capacity
  const { data: pickLeadTimeSetting } = useSetting('pick_lead_time_days');
  const { data: dailyCapacitySetting } = useSetting('daily_pick_capacity_hours');
  const upsertSettingMutation = useUpsertSetting();
  const calculatePickDueDatesMutation = useCalculatePickDueDates();
  
  const [pickLeadTimeInput, setPickLeadTimeInput] = useState(pickLeadTimeSetting?.value || "1");
  const [dailyCapacityInput, setDailyCapacityInput] = useState(dailyCapacitySetting?.value || "8");

  // Update inputs when settings load
  useEffect(() => {
    if (pickLeadTimeSetting?.value) {
      setPickLeadTimeInput(pickLeadTimeSetting.value);
    }
  }, [pickLeadTimeSetting]);

  useEffect(() => {
    if (dailyCapacitySetting?.value) {
      setDailyCapacityInput(dailyCapacitySetting.value);
    }
  }, [dailyCapacitySetting]);

  const handleSavePickLeadTime = async () => {
    try {
      await upsertSettingMutation.mutateAsync({
        key: 'pick_lead_time_days',
        value: pickLeadTimeInput,
        description: 'Number of business days to offset pick due dates before phase cleared to build dates'
      });
      toast({
        title: "Pick Lead Time Saved",
        description: `Pick lead time set to ${pickLeadTimeInput} business days.`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save pick lead time setting.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDailyCapacity = async () => {
    try {
      await upsertSettingMutation.mutateAsync({
        key: 'daily_pick_capacity_hours',
        value: dailyCapacityInput,
        description: 'Daily pick capacity in hours for material picking schedule'
      });
      toast({
        title: "Daily Capacity Saved",
        description: `Daily pick capacity set to ${dailyCapacityInput} hours.`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save daily capacity setting.",
        variant: "destructive",
      });
    }
  };

  const handleCalculatePickDueDates = async () => {
    try {
      const result = await calculatePickDueDatesMutation.mutateAsync();
      toast({
        title: "Pick Due Dates Calculated",
        description: `Updated ${result.updatedCount} cards with pick due dates using ${result.pickLeadTimeDays} business day lead time.`,
      });
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate pick due dates. Make sure to run 'Update Phase Dates' first.",
        variant: "destructive",
      });
    }
  };

  // Sort cards by phase first, then by position for material picking order
  const sortedCards = [...assemblyCards].sort((a, b) => {
    if (a.phase !== b.phase) {
      return a.phase - b.phase;
    }
    return (a.position || 0) - (b.position || 0);
  });

  const handleCardReorder = async (draggedId: string, newIndex: number) => {
    try {
      // Find the dragged card
      const draggedCard = sortedCards.find(card => card.id === draggedId);
      if (!draggedCard) return;

      // Create new order
      const reorderedCards = [...sortedCards];
      const currentIndex = reorderedCards.findIndex(card => card.id === draggedId);
      
      // Remove dragged card and insert at new position
      const [movedCard] = reorderedCards.splice(currentIndex, 1);
      reorderedCards.splice(newIndex, 0, movedCard);

      // Update positions for all cards
      for (let i = 0; i < reorderedCards.length; i++) {
        await updateCardMutation.mutateAsync({
          id: reorderedCards[i].id,
          position: i,
        });
      }

      toast({
        title: "Card reordered",
        description: `${draggedCard.cardNumber} moved to position ${newIndex + 1}`,
      });
    } catch (error) {
      toast({
        title: "Failed to reorder card",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = (cardId: string) => {
    // This function is called when a card status changes to ready_for_build
    // The UI will automatically update due to React Query refetching
  };

  // Check if user has permission to access this view
  if (!currentUser || !canAccess(currentUser, 'material_handler_view')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the Material Handler View.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading material handler...</p>
        </div>
      </div>
    );
  }

  // Group cards by phase for visual organization
  const cardsByPhase = [1, 2, 3, 4].map(phase => ({
    phase,
    cards: sortedCards.filter(card => card.phase === phase)
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground" data-testid="header-title">
              Material Handler View
            </h1>
          </div>
        </div>
      </header>

      {/* Material Handler Content */}
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Assembly Cards - Pick Order by Delivery Phase</h2>
              <p className="text-sm text-muted-foreground">
                Drag and drop to reorder cards within their delivery phase. Click "Ready for Build" when materials are picked and delivered.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col space-y-1">
                <Label htmlFor="daily-pick-capacity" className="text-xs font-medium text-muted-foreground">
                  Daily Pick Capacity (hrs)
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="daily-pick-capacity"
                    type="number"
                    value={dailyCapacityInput}
                    onChange={(e) => setDailyCapacityInput(e.target.value)}
                    placeholder="8"
                    className="w-24 text-sm"
                    data-testid="input-daily-pick-capacity"
                  />
                  <Button
                    onClick={handleSaveDailyCapacity}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={upsertSettingMutation.isPending}
                    data-testid="button-save-daily-capacity"
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <Label htmlFor="pick-lead-time" className="text-xs font-medium text-muted-foreground">
                  Pick Lead Time (days)
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="pick-lead-time"
                    type="number"
                    value={pickLeadTimeInput}
                    onChange={(e) => setPickLeadTimeInput(e.target.value)}
                    placeholder="1"
                    className="w-24 text-sm"
                    data-testid="input-pick-lead-time"
                  />
                  <Button
                    onClick={handleSavePickLeadTime}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={upsertSettingMutation.isPending}
                    data-testid="button-save-pick-lead-time"
                  >
                    Save
                  </Button>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                <Button
                  onClick={handleCalculatePickDueDates}
                  size="sm"
                  disabled={calculatePickDueDatesMutation.isPending}
                  data-testid="button-calculate-pick-due-dates"
                >
                  {calculatePickDueDatesMutation.isPending ? "Calculating..." : "Calculate Pick Due Dates"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Cards organized by phase */}
        <div className="space-y-8">
          {cardsByPhase.map(({ phase, cards }) => (
            <div key={phase} className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className={cn("w-4 h-4 rounded", getPhaseClass(phase))}></div>
                <h3 className="text-md font-semibold">Phase {phase} Delivery Sequence</h3>
                <span className="text-sm text-muted-foreground">({cards.length} cards)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cards.map((card, cardIndex) => {
                  const globalIndex = sortedCards.findIndex(c => c.id === card.id);
                  return (
                    <DropZone
                      key={card.id}
                      index={globalIndex}
                      onDrop={handleCardReorder}
                    >
                      <MaterialCard
                        card={card}
                        index={globalIndex}
                        onStatusChange={handleStatusChange}
                      />
                    </DropZone>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}