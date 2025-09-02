import { useDrag } from "react-dnd";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DeadTimeSource() {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "assembly-card",
    item: { 
      id: "new-dead-time",
      cardNumber: "DEAD_TIME",
      type: "DEAD_TIME",
      duration: 1, // Default 60 minutes
      isNewDeadTime: true
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), []);

  return (
    <div
      ref={drag}
      className={cn(
        "flex items-center gap-2 p-2 bg-gray-100 border-2 border-dashed border-gray-400 rounded-md cursor-grab active:cursor-grabbing hover:bg-gray-200 transition-colors",
        isDragging && "opacity-50"
      )}
      data-testid="dead-time-source"
    >
      <Clock className="h-4 w-4 text-gray-600" />
      <span className="text-sm font-medium text-gray-700">Dead Time</span>
      <span className="text-xs text-gray-500">(60 min)</span>
    </div>
  );
}