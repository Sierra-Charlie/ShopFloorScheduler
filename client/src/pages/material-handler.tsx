import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft, AlertTriangle } from "lucide-react";
import { useAssemblyCards, useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useUser, canAccess } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import { useDrop, useDrag } from "react-dnd";
import { AssemblyCard } from "@shared/schema";
import { cn } from "@/lib/utils";

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
  const [pickingElapsed, setPickingElapsed] = useState(0);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: "material-card",
    item: { id: card.id, originalIndex: index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [card.id, index]);

  const isReady = card.status === "ready_for_build";
  const isPicking = card.status === "picking";
  const phaseClass = isReady ? getPhaseClass(card.phase) : isPicking ? getPhaseClass(card.phase) : "bg-gray-400";

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

  return (
    <div
      ref={drag}
      className={cn(
        "material-card p-4 rounded-lg border border-black shadow-sm cursor-grab active:cursor-grabbing",
        phaseClass,
        isDragging && "opacity-50"
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
        </div>
        <div className="text-xs bg-black text-white px-2 py-1 rounded">
          Phase {card.phase}
        </div>
      </div>
      <div className="text-sm mb-2" title={getSequenceTypeLabel(card.type)}>
        {card.name}
      </div>
      <div className="text-xs mb-3 text-gray-700">
        {card.duration} hrs • {getSequenceTypeLabel(card.type)}
      </div>
      
      {isPicking && (
        <div className="text-center mb-3">
          <div className="text-sm font-medium text-green-800">Picking in progress</div>
          <div className="text-lg font-mono font-bold text-green-600">
            {formatTime(pickingElapsed)}
          </div>
        </div>
      )}
      
      {card.status === "scheduled" && (
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
      
      {isPicking && (
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
              <Button variant="outline" size="sm" data-testid="button-back-scheduler">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Scheduler
              </Button>
            <h1 className="text-2xl font-bold text-foreground" data-testid="header-title">
              Material Handler View
            </h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="font-semibold mr-2">Delivery Sequence:</span>
              <span className="phase-1 w-3 h-3 rounded"></span>
              <span>1</span>
              <span className="phase-2 w-3 h-3 rounded ml-4"></span>
              <span>2</span>
              <span className="phase-3 w-3 h-3 rounded ml-4"></span>
              <span>3</span>
              <span className="phase-4 w-3 h-3 rounded ml-4"></span>
              <span>4</span>
            </div>
          </div>
        </div>
      </header>

      {/* Material Handler Content */}
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Assembly Cards - Pick Order by Delivery Phase</h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop to reorder cards within their delivery phase. Click "Ready for Build" when materials are picked and delivered.
          </p>
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