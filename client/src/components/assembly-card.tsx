import { useDrag } from "react-dnd";
import { GripVertical, AlertTriangle } from "lucide-react";
import { AssemblyCard } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AssemblyCardProps {
  card: AssemblyCard;
  onEdit: (card: AssemblyCard) => void;
  hasWarning?: boolean;
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

export default function AssemblyCardComponent({ card, onEdit, hasWarning }: AssemblyCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "assembly-card",
    item: { id: card.id, cardNumber: card.cardNumber },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [card.id]);

  const phaseClass = getPhaseClass(card.phase);
  const width = Math.max(card.duration * 30, 90); // 30px per hour, minimum 90px

  return (
    <div
      ref={drag}
      className={cn(
        "assembly-card p-3 rounded-md font-medium text-sm shadow-sm relative cursor-grab active:cursor-grabbing",
        phaseClass,
        isDragging && "opacity-50",
        hasWarning && "border-2 border-warning"
      )}
      style={{ width: `${width}px` }}
      onDoubleClick={() => onEdit(card)}
      data-testid={`assembly-card-${card.cardNumber}`}
    >
      {/* Dependencies - Top Left */}
      {(card.dependencies?.length || 0) > 0 && (
        <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded text-center min-w-[60px]">
          <div className="font-semibold">Dependents</div>
          <div className="text-[10px]">{card.dependencies?.join(', ')}</div>
        </div>
      )}

      {/* Precedents - Top Right */}
      {(card.precedents?.length || 0) > 0 && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 py-0.5 rounded text-center min-w-[40px]">
          <div className="text-[10px]">{card.precedents?.join(', ')}</div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-bold">{card.cardNumber}</span>
        <GripVertical className="h-3 w-3 opacity-70" />
      </div>
      <div className="text-xs mt-1 opacity-90" title={getSequenceTypeLabel(card.type)}>
        {card.name}
      </div>
      <div className="text-xs opacity-80">{card.duration} hrs</div>
      
      {hasWarning && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full warning-indicator">
          <AlertTriangle className="h-2 w-2 text-white absolute top-0.5 left-0.5" />
        </div>
      )}
      
      
    </div>
  );
}
