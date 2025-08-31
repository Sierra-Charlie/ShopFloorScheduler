import { useDrop } from "react-dnd";
import { Assembler, AssemblyCard } from "@shared/schema";
import { useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useToast } from "@/hooks/use-toast";
import AssemblyCardComponent from "./assembly-card";
import { cn } from "@/lib/utils";

interface SwimLaneProps {
  assembler: Assembler;
  assemblyCards: AssemblyCard[];
  onCardEdit: (card: AssemblyCard) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "available": return "bg-success";
    case "busy": return "bg-warning";
    case "offline": return "bg-destructive";
    default: return "bg-muted";
  }
};

export default function SwimLane({ assembler, assemblyCards, onCardEdit }: SwimLaneProps) {
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "assembly-card",
    drop: async (item: { id: string; cardNumber: string; originalPosition?: number; assignedTo?: string }, monitor) => {
      try {
        const draggedCard = assemblyCards.find(c => c.id === item.id);
        const isAlreadyInThisLane = draggedCard?.assignedTo === assembler.id;
        
        if (isAlreadyInThisLane) {
          // Card is being reordered within the same lane
          // Get the mouse position to determine drop location
          const clientOffset = monitor.getClientOffset();
          if (clientOffset) {
            const laneElement = document.querySelector(`[data-testid="swim-lane-${assembler.id}"]`);
            if (laneElement) {
              const laneRect = laneElement.getBoundingClientRect();
              const relativeX = clientOffset.x - laneRect.left;
              
              // Find the card that should be after the drop position
              const sortedCards = assemblyCards
                .filter(c => c.assignedTo === assembler.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0));
              
              let newPosition = sortedCards.length;
              let cumulativeWidth = 0;
              
              for (let i = 0; i < sortedCards.length; i++) {
                const cardWidth = Math.max((sortedCards[i].duration || 1) * 60, 60) + 8; // card width + gap
                if (relativeX < cumulativeWidth + cardWidth / 2 && sortedCards[i].id !== item.id) {
                  newPosition = i;
                  break;
                }
                cumulativeWidth += cardWidth;
              }
              
              // Adjust position if dragging card from earlier position
              const currentIndex = sortedCards.findIndex(c => c.id === item.id);
              if (currentIndex < newPosition) {
                newPosition--;
              }
              
              // Only update if position actually changed
              if (currentIndex !== newPosition) {
                // Reorder the cards
                const reorderedCards = [...sortedCards];
                const [movedCard] = reorderedCards.splice(currentIndex, 1);
                reorderedCards.splice(newPosition, 0, movedCard);
                
                // Update positions for all cards
                for (let i = 0; i < reorderedCards.length; i++) {
                  await updateCardMutation.mutateAsync({
                    id: reorderedCards[i].id,
                    position: i,
                  });
                }
                
                toast({
                  title: "Card reordered",
                  description: `${item.cardNumber} moved to position ${newPosition + 1}`,
                });
              }
            }
          }
        } else {
          // Card is being moved to a different assembler
          // Calculate new position (add to end of current cards)
          const maxPosition = Math.max(-1, ...assemblyCards.map(c => c.position || 0));
          
          await updateCardMutation.mutateAsync({
            id: item.id,
            assignedTo: assembler.id,
            position: maxPosition + 1,
          });
          toast({
            title: "Card moved successfully",
            description: `${item.cardNumber} assigned to ${assembler.name}`,
          });
        }
      } catch (error) {
        toast({
          title: "Failed to move card",
          description: "Please try again",
          variant: "destructive",
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [assembler.id, assemblyCards, updateCardMutation]);

  // Check for dependency warnings and generate conflict details
  const getCardWarnings = (card: AssemblyCard) => {
    return card.dependencies?.some(dep => {
      const depCard = assemblyCards.find(c => c.cardNumber === dep);
      return !depCard || depCard.status !== "completed";
    });
  };

  const getDependencyConflictDetails = (card: AssemblyCard) => {
    if (!card.dependencies?.length) return null;
    
    const conflicts: string[] = [];
    
    card.dependencies.forEach(dep => {
      const depCard = assemblyCards.find(c => c.cardNumber === dep);
      if (!depCard) {
        conflicts.push(`Card ${dep} not found`);
      } else if (depCard.status !== "completed") {
        conflicts.push(`Card ${dep} is ${depCard.status} (needs to be completed)`);
      }
    });
    
    return conflicts.length > 0 ? conflicts.join('; ') : null;
  };

  return (
    <div className="flex items-center border-b border-border hover:bg-accent/30 transition-colors min-w-max">
      <div className="w-48 p-4 bg-card border-r border-border sticky left-0 z-20">
        <div className="font-semibold text-sm" data-testid={`assembler-name-${assembler.id}`}>
          {assembler.name}
        </div>
        <div className="text-xs text-muted-foreground capitalize" data-testid={`assembler-type-${assembler.id}`}>
          {assembler.type} Assembler
        </div>
        <div className="flex items-center mt-2 space-x-1">
          <div className={cn("w-2 h-2 rounded-full", getStatusColor(assembler.status))}></div>
          <span className="text-xs capitalize" data-testid={`assembler-status-${assembler.id}`}>
            {assembler.status}
          </span>
        </div>
      </div>
      
      <div
        ref={drop}
        className={cn(
          "swim-lane flex items-center space-x-2 p-3 min-h-20 flex-1",
          isOver && canDrop && "drag-over"
        )}
        data-testid={`swim-lane-${assembler.id}`}
      >
        {assemblyCards
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((card) => (
            <AssemblyCardComponent
              key={`${card.id}-${card.duration}-${card.name}`}
              card={card}
              onEdit={onCardEdit}
              hasWarning={getCardWarnings(card)}
              conflictDetails={getDependencyConflictDetails(card)}
            />
          ))}
      </div>
    </div>
  );
}
