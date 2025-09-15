import { useDrop } from "react-dnd";
import { Assembler, AssemblyCard, User } from "@shared/schema";
import { useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useUpdateAssembler } from "@/hooks/use-assemblers";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AssemblyCardComponent from "./assembly-card";
import { cn } from "@/lib/utils";

interface SwimLaneProps {
  assembler: Assembler;
  assemblyCards: AssemblyCard[]; // Cards for this specific assembler
  allAssemblyCards?: AssemblyCard[]; // All cards for type validation
  users: User[]; // Available users for assignment
  onCardEdit: (card: AssemblyCard) => void;
  onCardView?: (card: AssemblyCard) => void;
  startTimeOffset?: number;
  isCardOverdue?: (card: AssemblyCard) => boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "available": return "bg-success";
    case "busy": return "bg-warning";
    case "offline": return "bg-destructive";
    default: return "bg-muted";
  }
};

// Validate if an assembly card type can be placed in an assembler
const canCardBeAssignedToAssembler = (cardType: string, assemblerName: string): boolean => {
  // Dead time cards can be placed in any swim lane
  if (cardType === "DEAD_TIME") {
    return true;
  }
  
  // Mechanical assembly cards (M, S, P) can only go to Mech Assy 1-4
  if (["M", "S", "P"].includes(cardType)) {
    return assemblerName.startsWith("Mech Assy");
  }
  
  // Electrical assembly cards (E) can only go to Elec Assy 1-4
  if (cardType === "E") {
    return assemblerName.startsWith("Elec Assy");
  }
  
  // Run-in doesn't have type restrictions yet - allow all for now
  if (assemblerName === "Run-in") {
    return true;
  }
  
  // For other card types (KB, etc.) or assemblers, allow for now
  return true;
};

export default function SwimLane({ assembler, assemblyCards, allAssemblyCards, users, onCardEdit, onCardView, startTimeOffset = 0, isCardOverdue }: SwimLaneProps) {
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const updateAssemblerMutation = useUpdateAssembler();

  // Handle user assignment to assembler
  const handleUserAssignment = async (userId: string) => {
    try {
      const assignedUserId = userId === "none" ? null : userId;
      
      await updateAssemblerMutation.mutateAsync({
        id: assembler.id,
        assignedUser: assignedUserId
      });
      
      const selectedUser = users.find(u => u.id === userId);
      toast({
        title: "User Assignment Updated",
        description: `${assembler.name} is now assigned to ${selectedUser?.name || 'no one'}`,
      });
    } catch (error) {
      console.error('Error updating assembler assignment:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to update user assignment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: "assembly-card",
    canDrop: (item: { id: string; cardNumber: string; originalPosition?: number; assignedTo?: string; type?: string; isNewDeadTime?: boolean }) => {
      // Handle new dead time creation - always allowed
      if (item.isNewDeadTime) {
        return true;
      }

      // Find the dragged card from all assembly cards
      const allCards = allAssemblyCards || assemblyCards;
      const draggedCard = allCards.find(c => c.id === item.id);
      
      if (!draggedCard) return false;
      
      // Check if card type is compatible with this assembler
      return canCardBeAssignedToAssembler(draggedCard.type, assembler.name);
    },
    drop: async (item: { id: string; cardNumber: string; originalPosition?: number; assignedTo?: string; type?: string; duration?: number; isNewDeadTime?: boolean }, monitor) => {
      try {
        // Handle new dead time card creation
        if (item.isNewDeadTime) {
          // Get mouse position to determine where to insert the dead time
          const clientOffset = monitor.getClientOffset();
          let newPosition = assemblyCards.length; // Default to end
          
          if (clientOffset) {
            const laneElement = document.querySelector(`[data-testid="swim-lane-${assembler.id}"]`);
            if (laneElement) {
              const laneRect = laneElement.getBoundingClientRect();
              const relativeX = clientOffset.x - laneRect.left;
              
              // Find the position where dead time should be inserted
              const sortedCards = assemblyCards
                .filter(c => c.assignedTo === assembler.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0));
              
              let cumulativeWidth = 0;
              for (let i = 0; i < sortedCards.length; i++) {
                const cardWidth = Math.max((sortedCards[i].duration || 1) * 60, 60) + 8;
                if (relativeX < cumulativeWidth + cardWidth / 2) {
                  newPosition = i;
                  break;
                }
                cumulativeWidth += cardWidth;
              }
              
              // Update positions of cards that come after the insertion point
              for (let i = newPosition; i < sortedCards.length; i++) {
                await updateCardMutation.mutateAsync({
                  id: sortedCards[i].id,
                  position: i + 1,
                });
              }
            }
          }
          
          // Create new dead time card
          const response = await fetch("/api/assembly-cards", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              cardNumber: `DT-${Date.now()}`,
              name: "Dead Time",
              type: "DEAD_TIME",
              duration: item.duration || 1,
              phase: 1,
              assignedTo: assembler.id,
              status: "scheduled",
              position: newPosition,
              dependencies: [],
              precedents: [],
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to create dead time");
          }

          toast({
            title: "Dead time added",
            description: `Dead time (${item.duration || 1}hr) added to ${assembler.name}`,
          });
          return;
        }

        // Find the dragged card from all assembly cards (existing card logic)
        const allCards = allAssemblyCards || assemblyCards;
        const draggedCard = allCards.find(c => c.id === item.id);
        
        if (!draggedCard) {
          throw new Error("Card not found");
        }
        
        // Double-check compatibility before proceeding
        if (!canCardBeAssignedToAssembler(draggedCard.type, assembler.name)) {
          toast({
            title: "Invalid Assignment",
            description: `${draggedCard.type}-type cards cannot be assigned to ${assembler.name}`,
            variant: "destructive",
          });
          return;
        }
        
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
                
                // Update positions for all cards using duration-based positioning
                // Use displayDuration (actualDuration for completed cards, otherwise planned duration)
                let cumulativePosition = 0;
                for (let i = 0; i < reorderedCards.length; i++) {
                  await updateCardMutation.mutateAsync({
                    id: reorderedCards[i].id,
                    position: cumulativePosition,
                  });
                  // Next card starts after this card's display duration
                  const displayDuration = reorderedCards[i].status === "completed" && reorderedCards[i].actualDuration ? reorderedCards[i].actualDuration : reorderedCards[i].duration;
                  cumulativePosition += displayDuration;
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
          // Calculate new position based on cumulative duration of existing cards
          const sortedCards = assemblyCards
            .filter(c => c.assignedTo === assembler.id)
            .sort((a, b) => (a.position || 0) - (b.position || 0));
          
          let newPosition = 0;
          for (const existingCard of sortedCards) {
            const displayDuration = existingCard.status === "completed" && existingCard.actualDuration ? existingCard.actualDuration : existingCard.duration;
            const cardEnd = (existingCard.position || 0) + displayDuration;
            newPosition = Math.max(newPosition, cardEnd);
          }
          
          await updateCardMutation.mutateAsync({
            id: item.id,
            assignedTo: assembler.id,
            position: newPosition,
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
  }), [assembler.id, assembler.name, assemblyCards, allAssemblyCards, updateCardMutation, toast]);

  // Check for dependency warnings and generate conflict details
  const getCardWarnings = (card: AssemblyCard) => {
    // Check standard dependency conflicts
    const hasDependencyConflict = card.dependencies?.some(dep => {
      const depCard = allAssemblyCards?.find(c => c.cardNumber === dep);
      if (!depCard) return true; // Card not found
      
      // Check position-based conflicts within the same assembler
      if (depCard.assignedTo === card.assignedTo) {
        // Dependency card is in the same swim lane - check position order
        // Dependency should come BEFORE (lower position number) the dependent card
        return (depCard.position || 0) > (card.position || 0);
      } else {
        // Cross-lane dependency: Use actual date/time information when available for accurate comparison
        if (depCard.startTime && depCard.endTime && card.startTime) {
          const depEndTime = new Date(depCard.endTime);
          const cardStartTime = new Date(card.startTime);
          
          // Conflict if dependency finishes AFTER dependent card starts
          return depEndTime > cardStartTime;
        } else {
          // For cross-lane dependencies, position values are not comparable 
          // since they're lane-specific. Without timing data, we cannot 
          // accurately determine cross-lane conflicts, so we default to no conflict
          // to avoid false positives. However, we should flag blocked dependencies.
          return depCard.status === "blocked";
        }
      }
    });

    // Check crane dependency conflicts based on timeline position overlap
    const hasCraneConflict = card.requiresCrane && 
      allAssemblyCards?.some(otherCard => {
        if (otherCard.id === card.id || !otherCard.requiresCrane || otherCard.assignedTo === card.assignedTo) {
          return false; // Skip same card, non-crane cards, or cards in same lane
        }
        
        // If both cards have timing information, check time overlap
        if (card.startTime && card.endTime && otherCard.startTime && otherCard.endTime) {
          const cardStart = new Date(card.startTime);
          const cardEnd = new Date(card.endTime);
          const otherStart = new Date(otherCard.startTime);
          const otherEnd = new Date(otherCard.endTime);
          
          // Time periods overlap if: start1 < end2 && start2 < end1
          return cardStart < otherEnd && otherStart < cardEnd;
        }
        
        // For cards without timing info, check timeline position overlap
        // Calculate timeline positions based on position and duration (position = hours from 6am)
        const cardStart = card.position || 0;
        const cardEnd = cardStart + card.duration;
        const otherStart = otherCard.position || 0;
        const otherEnd = otherStart + otherCard.duration;
        
        // Timeline positions overlap if: start1 < end2 && start2 < end1
        return cardStart < otherEnd && otherStart < cardEnd;
      });
    
    return hasDependencyConflict || hasCraneConflict;
  };

  const getDependencyConflictDetails = (card: AssemblyCard) => {
    const conflicts: string[] = [];
    
    // Check standard dependency conflicts
    if (card.dependencies?.length) {
      card.dependencies.forEach(dep => {
        const depCard = allAssemblyCards?.find(c => c.cardNumber === dep);
        if (!depCard) {
          conflicts.push(`Card ${dep} not found`);
        } else if (depCard.assignedTo === card.assignedTo) {
          // Same assembler - check position order
          // Dependency should come BEFORE (lower position number) the dependent card
          if ((depCard.position || 0) > (card.position || 0)) {
            conflicts.push(`Card ${dep} is positioned after ${card.cardNumber} in the same lane`);
          }
        } else {
          // Cross-lane dependency: Use actual date/time information when available for accurate comparison
          if (depCard.startTime && depCard.endTime && card.startTime) {
            const depEndTime = new Date(depCard.endTime);
            const cardStartTime = new Date(card.startTime);
            
            // Conflict if dependency finishes AFTER dependent card starts
            if (depEndTime > cardStartTime) {
              const depEndTimeStr = depEndTime.toLocaleString();
              const cardStartTimeStr = cardStartTime.toLocaleString();
              conflicts.push(`Card ${dep} finishes after ${card.cardNumber} starts (${depEndTimeStr} > ${cardStartTimeStr})`);
            } else if (depCard.status === "blocked") {
              conflicts.push(`Card ${dep} is blocked`);
            }
          } else {
            // For cross-lane dependencies without timing data, we cannot accurately 
            // determine conflicts since position values are lane-specific
            // Only flag if the dependency is in a problematic state
            if (depCard.status === "blocked") {
              conflicts.push(`Card ${dep} is blocked`);
            }
            // Note: Without timing data, we cannot detect timing-based conflicts across lanes
          }
        }
      });
    }
    
    // Check crane dependency conflicts based on timeline position overlap
    if (card.requiresCrane && allAssemblyCards) {
      const craneConflicts = allAssemblyCards.filter(otherCard => {
        if (otherCard.id === card.id || !otherCard.requiresCrane || otherCard.assignedTo === card.assignedTo) {
          return false; // Skip same card, non-crane cards, or cards in same lane
        }
        
        // If both cards have timing information, check time overlap
        if (card.startTime && card.endTime && otherCard.startTime && otherCard.endTime) {
          const cardStart = new Date(card.startTime);
          const cardEnd = new Date(card.endTime);
          const otherStart = new Date(otherCard.startTime);
          const otherEnd = new Date(otherCard.endTime);
          
          // Time periods overlap if: start1 < end2 && start2 < end1
          return cardStart < otherEnd && otherStart < cardEnd;
        }
        
        // For cards without timing info, check timeline position overlap
        // Calculate timeline positions based on position and duration (position = hours from 6am)
        const cardStart = card.position || 0;
        const cardEnd = cardStart + card.duration;
        const otherStart = otherCard.position || 0;
        const otherEnd = otherStart + otherCard.duration;
        
        // Timeline positions overlap if: start1 < end2 && start2 < end1
        return cardStart < otherEnd && otherStart < cardEnd;
      });
      
      craneConflicts.forEach(conflictCard => {
        if (card.startTime && card.endTime && conflictCard.startTime && conflictCard.endTime) {
          conflicts.push(`Crane conflict with card ${conflictCard.cardNumber} - both require crane during overlapping times`);
        } else {
          conflicts.push(`Crane conflict with card ${conflictCard.cardNumber} - both require crane at overlapping timeline positions`);
        }
      });
    }
    
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
        
        {/* User Assignment Dropdown */}
        <div className="mt-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Assigned User:</div>
          <Select 
            value={assembler.assignedUser || "none"} 
            onValueChange={handleUserAssignment}
            data-testid={`select-user-${assembler.id}`}
          >
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No user assigned</SelectItem>
              {(users || [])
                .filter(user => user.role === 'assembler') // Only show assemblers
                .map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div
        ref={drop}
        className={cn(
          "swim-lane flex items-center p-3 min-h-20 flex-1",
          isOver && canDrop && "drag-over"
        )}
        style={{ paddingLeft: `${3 * 4 + startTimeOffset + 10}px` }} // 3 * 4px (p-3) + start time offset + 10px (align with 8a line)
        data-testid={`swim-lane-${assembler.id}`}
      >
        {assemblyCards
          .sort((a, b) => (a.position || 0) - (b.position || 0))
          .map((card) => (
            <AssemblyCardComponent
              key={`${card.id}-${card.duration}-${card.name}`}
              card={card}
              onEdit={onCardEdit}
              onView={onCardView}
              hasWarning={!!getCardWarnings(card)}
              conflictDetails={getDependencyConflictDetails(card)}
              isOverdue={isCardOverdue ? isCardOverdue(card) : false}
            />
          ))}
      </div>
    </div>
  );
}
