import { useDrop } from "react-dnd";
import { AssemblyCard } from "@shared/schema";
import { cn } from "@/lib/utils";
import DraggableAssemblyCard from "./draggable-assembly-card";

interface BuildAreaZoneProps {
  title: string;
  cards: AssemblyCard[];
  areaId: string;
  onCardMove: (cardId: string, newArea: string) => void;
  className?: string;
}

export default function BuildAreaZone({ 
  title, 
  cards, 
  areaId, 
  onCardMove, 
  className 
}: BuildAreaZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: "assembly-card",
    drop: (item: { id: string; currentArea: string }) => {
      if (item.currentArea !== areaId) {
        onCardMove(item.id, areaId);
      }
    },
    canDrop: (item: { id: string; currentArea: string }) => {
      // Allow dropping from different areas
      return item.currentArea !== areaId;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  });

  return (
    <div
      ref={drop}
      className={cn(
        "p-4 rounded-lg min-h-24 transition-all duration-200",
        className,
        isOver && canDrop && "ring-2 ring-blue-500 ring-opacity-50 bg-blue-100/50 dark:bg-blue-900/50",
        isOver && !canDrop && "ring-2 ring-red-500 ring-opacity-50 bg-red-100/50 dark:bg-red-900/50"
      )}
    >
      {/* Area Title */}
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {/* Cards Container */}
      <div className="grid grid-cols-2 gap-2">
        {cards.length === 0 ? (
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
            No cards in this area
          </div>
        ) : (
          cards.map((card) => (
            <DraggableAssemblyCard
              key={card.id}
              card={card}
              currentArea={areaId}
              showMiniFormat={true}
            />
          ))
        )}
      </div>

      {/* Drop indicator when hovering */}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center pointer-events-none">
          <span className="text-blue-700 dark:text-blue-300 font-semibold">
            Drop card here
          </span>
        </div>
      )}
    </div>
  );
}