import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, Camera } from "lucide-react";
import { useAssemblyCards, useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useUser, canAccess } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CameraCapture } from "@/components/CameraCapture";

const getPhaseClass = (phase: number) => {
  switch (phase) {
    case 1: return "phase-1";
    case 2: return "phase-2";
    case 3: return "phase-3";
    case 4: return "phase-4";
    case 5: return "phase-5";
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

interface PlanningCardProps {
  card: AssemblyCard;
  index: number;
  onStatusChange: (cardId: string) => void;
}

function PlanningCard({ card, index, onStatusChange }: PlanningCardProps) {
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const [showAndonDialog, setShowAndonDialog] = useState(false);
  const [andonIssue, setAndonIssue] = useState("");
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "planning-card",
    item: { id: card.id, originalIndex: index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [card.id, index]);

  const isClearedForPicking = card.status === "cleared_for_picking";
  // Planning cards show phase colors to help with organization
  const phaseClass = getPhaseClass(card.phase || 1);

  const handleClearedForPicking = async () => {
    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        status: "cleared_for_picking",
      });
      onStatusChange(card.id);
      toast({
        title: "Status updated",
        description: `${card.cardNumber} cleared for picking`,
      });
    } catch (error) {
      toast({
        title: "Failed to update status",
        description: "Please try again",
        variant: "destructive",
      });
    }
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
          reporterName: "Scheduler",
          description: andonIssue,
          photoPath,
          submittedBy: "Scheduler", // Planning role submitting
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
        "planning-card p-4 rounded-lg border border-black shadow-sm cursor-grab active:cursor-grabbing",
        phaseClass,
        isDragging && "opacity-50"
      )}
      data-testid={`planning-card-${card.cardNumber}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-lg">{card.cardNumber}</span>
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
      
      {!isClearedForPicking && card.status === "scheduled" && (
        <div className="space-y-2">
          <Button
            onClick={handleClearedForPicking}
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            data-testid={`button-cleared-${card.cardNumber}`}
          >
            <Package className="mr-2 h-4 w-4" />
            Cleared for Picking
          </Button>
        </div>
      )}
      
      {isClearedForPicking && (
        <div className="text-center text-sm font-medium text-green-800 mb-2">
          ✓ Cleared for Picking
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
    accept: "planning-card",
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

export default function Planning() {
  const { currentUser } = useUser();
  const { data: assemblyCards = [], isLoading } = useAssemblyCards();
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();

  // Sort by phase first, then by position for planning order
  const sortedCards = [...assemblyCards]
    .sort((a, b) => {
      if (a.phase !== b.phase) {
        return (a.phase || 1) - (b.phase || 1);
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
    // This function is called when a card status changes
    // The UI will automatically update due to React Query refetching
  };

  // Check if user has permission to access this view
  if (!currentUser || !canAccess(currentUser, 'planning_view')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the Planning View.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading planning...</p>
        </div>
      </div>
    );
  }

  // Group cards by phase for visual organization
  const cardsByPhase = [1, 2, 3, 4, 5].map(phase => ({
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
              Planning View
            </h1>
          </div>
        </div>
      </header>

      {/* Planning Content */}
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Assembly Cards - Planning Approval</h2>
          <p className="text-sm text-muted-foreground">
            Review and approve assembly cards for material picking. Click "Cleared for Picking" when ready for material handler processing.
          </p>
        </div>

        {/* Cards organized by phase */}
        <div className="space-y-8">
          {cardsByPhase.map(({ phase, cards }) => (
            <div key={phase} className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className={cn("w-4 h-4 rounded", getPhaseClass(phase))}></div>
                <h3 className="text-md font-semibold">Phase {phase} Delivery Phase</h3>
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
                      <PlanningCard
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