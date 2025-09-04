import { useDrag } from "react-dnd";
import { AssemblyCard } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DraggableAssemblyCardProps {
  card: AssemblyCard;
  currentArea: string;
  showMiniFormat?: boolean;
}

const getPhaseColor = (phase: number) => {
  switch (phase) {
    case 1: return "bg-red-500";
    case 2: return "bg-yellow-500";
    case 3: return "bg-green-500";
    case 4: return "bg-blue-500";
    default: return "bg-gray-500";
  }
};

const getPhaseBackgroundColor = (phase: number) => {
  switch (phase) {
    case 1: return "bg-[#ff8000] text-white"; // Orange background for phase 1
    case 2: return "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200";
    case 3: return "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200";
    case 4: return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200";
    default: return "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-200";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "M": return "Mechanical";
    case "E": return "Electrical";
    case "S": return "Sub-Assembly";
    case "P": return "Pre-Assembly";
    case "KB": return "Kanban";
    default: return type;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-200";
    case "assembling": return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200";
    case "ready_for_build": return "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-200";
    case "picking": return "bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-200";
    case "paused": return "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-200";
    case "blocked": return "bg-red-100 border-red-300 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200";
    default: return "bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/20 dark:border-gray-700 dark:text-gray-200";
  }
};

const getMiniStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-500 text-white";
    case "assembling": return "bg-blue-500 text-white";
    case "ready_for_build": return "bg-orange-500 text-white";
    case "picking": return "bg-[#f97316] text-white";
    case "delivered_to_paint": return "bg-orange-500 text-white";
    case "cleared_for_picking": return "bg-white text-black border-2 border-black";
    case "paused": return "bg-gray-500 text-white";
    case "blocked": return "bg-red-500 text-white";
    case "scheduled": return "bg-gray-300 text-black";
    default: return "bg-gray-300 text-black";
  }
};

export default function DraggableAssemblyCard({ 
  card, 
  currentArea, 
  showMiniFormat = false 
}: DraggableAssemblyCardProps) {
  const [{ isDragging }, drag] = useDrag({
    type: "assembly-card",
    item: { id: card.id, currentArea },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  if (showMiniFormat) {
    return (
      <div
        ref={drag}
        className={cn(
          "relative rounded-lg p-2 cursor-move transition-all duration-200 hover:shadow-md min-h-[60px]",
          getMiniStatusColor(card.status),
          isDragging && "opacity-50 rotate-2 scale-95"
        )}
        data-testid={`draggable-card-${card.cardNumber}`}
      >
        {/* Card number in top-right */}
        <div className="absolute top-1 right-1 text-xs font-medium">
          {card.cardNumber}
        </div>
        
        {/* Card name on left */}
        <div className="text-xs font-medium mb-1 pr-6">
          {card.name}
        </div>
        
        {/* Bottom row with type badge and duration */}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs font-semibold">{card.type}</span>
          <div className="flex items-center space-x-2">
            {(card.status === "picking" || card.status === "delivered_to_paint" || card.status === "cleared_for_picking") && (
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                card.status === "picking" ? "bg-green-500 text-white" :
                card.status === "delivered_to_paint" ? "bg-purple-600 text-white" :
                card.status === "cleared_for_picking" ? "bg-white text-black border-2 border-black" : ""
              )}>
                P
              </div>
            )}
            <span className="text-xs text-muted-foreground">{card.duration}h</span>
          </div>
        </div>
      </div>
    );
  }

  // Full format (same as regular assembly cards)
  return (
    <div
      ref={drag}
      className={cn(
        "relative bg-white dark:bg-gray-800 border rounded-lg p-3 cursor-move transition-all duration-200 hover:shadow-lg",
        getStatusColor(card.status),
        isDragging && "opacity-50 rotate-1 scale-95"
      )}
      data-testid={`draggable-card-${card.cardNumber}`}
    >
      {/* Header with phase and card number */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={cn("w-3 h-3 rounded-full", getPhaseColor(card.phase))}></div>
          <span className="text-sm font-bold">{card.cardNumber}</span>
          {(card.status === "picking" || card.status === "delivered_to_paint" || card.status === "cleared_for_picking") && (
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
              card.status === "picking" ? "bg-green-500 text-white" :
              card.status === "delivered_to_paint" ? "bg-purple-600 text-white" :
              card.status === "cleared_for_picking" ? "bg-white text-black border-2 border-black" : ""
            )}>
              P
            </div>
          )}
        </div>
        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
          {getTypeLabel(card.type)}
        </span>
      </div>
      
      {/* Card name */}
      <h3 className="text-sm font-semibold mb-2 line-clamp-2">
        {card.name}
      </h3>
      
      {/* Duration */}
      <div className="text-xs text-muted-foreground">
        Duration: {card.duration} hours
      </div>
      
      {/* Sub Assy Area if applicable */}
      {(card.type === "S" || card.type === "P") && card.subAssyArea && (
        <div className="text-xs text-muted-foreground mt-1">
          Sub Assy Area: {card.subAssyArea}
        </div>
      )}
    </div>
  );
}