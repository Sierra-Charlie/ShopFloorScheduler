import { useDrag } from "react-dnd";
import { GripVertical, AlertTriangle, Clock, Pin } from "lucide-react";
import { AssemblyCard } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AssemblyCardProps {
  card: AssemblyCard;
  onEdit: (card: AssemblyCard) => void;
  onView?: (card: AssemblyCard) => void;
  hasWarning?: boolean;
  conflictDetails?: string | null;
  isOverdue?: boolean;
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
    case "DEAD_TIME": return "Dead Time";
    default: return type;
  }
};

export default function AssemblyCardComponent({ card, onEdit, onView, hasWarning, conflictDetails, isOverdue }: AssemblyCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "assembly-card",
    item: { 
      id: card.id, 
      cardNumber: card.cardNumber,
      originalPosition: card.position,
      assignedTo: card.assignedTo 
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !card.grounded, // Disable dragging for grounded cards
  }), [card.id, card.position, card.assignedTo, card.grounded]);

  // Handle dead time cards differently
  if (card.type === "DEAD_TIME") {
    const width = Math.max((card.duration || 1) * 60, 60); // 60px per hour, minimum 60px
    const durationText = card.duration! < 1 
      ? `${Math.round(card.duration! * 60)} min` 
      : card.duration === 1 
        ? "1 hr" 
        : `${card.duration} hrs`;

    return (
      <div
        ref={drag}
        className={cn(
          "assembly-card p-3 rounded-md font-medium text-sm shadow-sm relative cursor-grab active:cursor-grabbing border-2 border-dashed border-gray-400",
          "bg-gray-200/50 opacity-80",
          isDragging && "opacity-30"
        )}
        style={{ 
          width: `${width}px`,
          backgroundImage: `repeating-linear-gradient(
            45deg,
            rgba(156, 163, 175, 0.3) 0px,
            rgba(156, 163, 175, 0.3) 10px,
            transparent 10px,
            transparent 20px
          )`
        }}
        onClick={() => onView?.(card)}
        onDoubleClick={() => onEdit(card)}
        data-testid={`assembly-card-${card.cardNumber}`}
      >
        <div className="flex items-center justify-center h-full">
          <Clock className="h-4 w-4 text-gray-600 mr-2" />
          <div className="text-center">
            <div className="font-bold text-gray-700">Dead Time</div>
            <div className="text-xs text-gray-600">{durationText}</div>
          </div>
        </div>
      </div>
    );
  }

  const phaseClass = 
    isOverdue ? "bg-red-500" : // Override all other colors when overdue
    card.status === "ready_for_build" ? getPhaseClass(card.phase) :
    card.status === "assembling" ? "bg-blue-500" :
    card.status === "completed" ? "bg-green-500" :
    card.status === "picking" ? getPhaseClass(card.phase) :
    card.status === "delivered_to_paint" ? getPhaseClass(card.phase) :
    "bg-gray-400";
  // Calculate width reactively - use actualDuration for completed cards, otherwise use expected duration
  const displayDuration = card.status === "completed" && card.actualDuration ? card.actualDuration : card.duration;
  const width = Math.max((displayDuration || 1) * 60, 60); // 60px per hour, minimum 60px

  const cardElement = (
    <div
      ref={drag}
      className={cn(
        "assembly-card p-3 rounded-md font-medium text-sm shadow-sm relative border border-black",
        card.grounded ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
        phaseClass,
        isDragging && "opacity-50",
        hasWarning && "border-2 border-warning",
        isOverdue && "border-2 border-red-700 shadow-lg animate-pulse",
        card.grounded && "border-2 border-orange-500 shadow-md"
      )}
      style={{ width: `${width}px` }}
      onClick={() => onView?.(card)}
      onDoubleClick={() => onEdit(card)}
      data-testid={`assembly-card-${card.cardNumber}`}
    >
      {/* Dependencies - Top Left */}
      {(card.dependencies?.length || 0) > 0 && (
        <div className="absolute -top-2 -left-2 text-xs px-1 py-0.5 rounded text-center min-w-[40px] bg-[#000000] text-[#ffffff]">
          <div className="text-[10px]">{card.dependencies?.join(', ')}</div>
        </div>
      )}
      {/* Precedents - Top Right */}
      {(card.precedents?.length || 0) > 0 && (
        <div className="absolute -top-2 -right-2 text-white text-xs px-1 py-0.5 rounded text-center min-w-[40px] bg-[#000000]">
          <div className="text-[10px]">{card.precedents?.join(', ')}</div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="font-bold">{card.cardNumber}</span>
        <div className="flex items-center space-x-1">
          {card.grounded && (
            <Pin className="h-3 w-3 text-orange-600" />
          )}
          <GripVertical className={cn("h-3 w-3", card.grounded ? "opacity-30" : "opacity-70")} />
        </div>
      </div>
      <div className="text-xs mt-1 opacity-90" title={getSequenceTypeLabel(card.type)}>
        {card.name}
      </div>
      <div className="text-xs opacity-80">{card.duration} hrs</div>
      {/* Small white P indicator for cleared for picking status */}
      {card.status === "cleared_for_picking" && (
        <div className="absolute bottom-1 left-1 w-6 h-6 bg-white border-2 border-black rounded-full flex items-center justify-center z-10">
          <span className="text-black font-bold text-xs">P</span>
        </div>
      )}
      {/* Small green P indicator for picking status */}
      {card.status === "picking" && (
        <div className="absolute bottom-1 left-1 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center z-10">
          <span className="text-white font-bold text-xs">P</span>
        </div>
      )}
      {/* Small purple P indicator for delivered to paint status */}
      {card.status === "delivered_to_paint" && (
        <div className="absolute bottom-1 left-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center z-10">
          <span className="text-white font-bold text-xs">P</span>
        </div>
      )}
      {hasWarning && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full warning-indicator">
          <AlertTriangle className="h-2 w-2 text-white absolute top-0.5 left-0.5" />
        </div>
      )}
    </div>
  );

  // Wrap with tooltip if there are dependency conflicts
  if (hasWarning && conflictDetails) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">Dependency Conflict</p>
          <p className="text-xs">{conflictDetails}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardElement;
}
