import { useDrop } from "react-dnd";
import { AssemblyCard } from "@shared/schema";

interface CardDropTargetProps {
  card: AssemblyCard;
  position: number;
  assemblyCards: AssemblyCard[];
  assemblerId: string;
  updateCardMutation: any;
  toast: any;
  children: React.ReactNode;
}

export default function CardDropTarget({ 
  card, 
  position, 
  assemblyCards, 
  assemblerId, 
  updateCardMutation, 
  toast, 
  children 
}: CardDropTargetProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "assembly-card",
    drop: async (item: { id: string; cardNumber: string; originalPosition?: number; assignedTo?: string }) => {
      try {
        const draggedCard = assemblyCards.find(c => c.id === item.id);
        const isFromSameLane = draggedCard?.assignedTo === assemblerId;
        
        if (isFromSameLane && item.id !== card.id) {
          // Reordering within the same lane
          const sortedCards = assemblyCards
            .filter(c => c.assignedTo === assemblerId)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
          
          const oldIndex = sortedCards.findIndex(c => c.id === item.id);
          const newIndex = position;
          
          if (oldIndex !== newIndex) {
            // Reorder the cards array
            const reorderedCards = [...sortedCards];
            const [movedCard] = reorderedCards.splice(oldIndex, 1);
            reorderedCards.splice(newIndex, 0, movedCard);
            
            // Update positions for all affected cards
            for (let i = 0; i < reorderedCards.length; i++) {
              if (reorderedCards[i].position !== i) {
                await updateCardMutation.mutateAsync({
                  id: reorderedCards[i].id,
                  position: i,
                });
              }
            }
            
            toast({
              title: "Card reordered",
              description: `${item.cardNumber} moved to position ${newIndex + 1}`,
            });
          }
        }
      } catch (error) {
        console.error("Failed to reorder card:", error);
        toast({
          title: "Failed to reorder card",
          description: "Please try again",
          variant: "destructive",
        });
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [card.id, position, assemblyCards, assemblerId, updateCardMutation, toast]);

  return (
    <div
      ref={drop}
      className={`relative ${isOver ? 'before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-primary before:z-10' : ''}`}
    >
      {children}
    </div>
  );
}