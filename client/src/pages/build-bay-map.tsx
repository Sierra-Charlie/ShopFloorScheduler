import { useState, useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { useAssemblyCards, useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useToast } from "@/hooks/use-toast";
import { AssemblyCard } from "@shared/schema";
import BuildAreaZone from "@/components/build-area-zone";
import turboImage from "@assets/Turbo 505_1756779347428.png";

// Detect if we're on a touch device
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const backend = isTouchDevice() ? TouchBackend : HTML5Backend;

export default function BuildBayMap() {
  const [hasChanges, setHasChanges] = useState(false);
  const [cardPositions, setCardPositions] = useState<{[key: string]: string}>({});
  
  const { toast } = useToast();
  const { data: assemblyCards = [] } = useAssemblyCards();
  const { data: assemblers = [] } = useAssemblers();
  const updateCardMutation = useUpdateAssemblyCard();

  // Filter cards by area based on status and type
  const getCardsForArea = (areaType: string, areaNumber?: number) => {
    return assemblyCards.filter(card => {
      switch (areaType) {
        case "warehouse":
          return card.status === "picking";
        case "paint":
          return card.status === "delivered_to_paint";
        case "mechanical-pre":
          return card.type === "P" && card.status === "ready_for_build";
        case "electrical-pre":
          return card.type === "E" && card.status === "ready_for_build";
        case "sub-assy":
          return areaNumber && (
            (card.type === "S" && (card.status === "ready_for_build" || card.status === "assembling") && card.subAssyArea === areaNumber) ||
            (card.type === "P" && card.status === "completed" && card.subAssyArea === areaNumber)
          );
        case "building":
          return card.type === "M" && card.status === "assembling";
        default:
          return false;
      }
    });
  };

  const handleCardMove = (cardId: string, newArea: string) => {
    setCardPositions(prev => ({
      ...prev,
      [cardId]: newArea
    }));
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    let successCount = 0;
    const totalChanges = Object.keys(cardPositions).length;

    for (const [cardId, newArea] of Object.entries(cardPositions)) {
      try {
        // Parse the area to determine subAssyArea
        let subAssyArea = null;
        if (newArea.startsWith("sub-assy-")) {
          subAssyArea = parseInt(newArea.split("-")[2]);
        }

        await updateCardMutation.mutateAsync({
          id: cardId,
          subAssyArea
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to update card ${cardId}:`, error);
      }
    }

    if (successCount === totalChanges) {
      toast({
        title: "Changes Saved",
        description: `Successfully updated ${successCount} assembly card positions.`,
      });
      setHasChanges(false);
      setCardPositions({});
    } else {
      toast({
        title: "Partial Success",
        description: `Updated ${successCount} of ${totalChanges} assembly cards. Some updates failed.`,
        variant: "destructive",
      });
    }
  };

  return (
    <DndProvider backend={backend}>
      <div className="min-h-screen bg-background">
        {/* Page Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">505 Build Bay Map</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Visual floor plan showing assembly card locations by status and type
                </p>
              </div>
              
              {hasChanges && (
                <Button 
                  onClick={handleSaveChanges}
                  className="bg-success hover:bg-success/90 text-white font-medium"
                  disabled={updateCardMutation.isPending}
                  data-testid="button-save-changes"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Build Bay Layout */}
        <div className="p-6">
          <div className="grid grid-cols-12 gap-4 h-[800px]">
            
            {/* Top Row - Pre-Assembly Areas */}
            <div className="col-span-12 grid grid-cols-4 gap-4 h-32">
              {/* Warehouse Picking */}
              <BuildAreaZone
                title="WAREHOUSE PICKING"
                cards={getCardsForArea("warehouse")}
                areaId="warehouse"
                onCardMove={handleCardMove}
                className="border-2 border-dashed border-black bg-white dark:bg-gray-900"
              />
              
              {/* Paint Area */}
              <BuildAreaZone
                title="PAINT"
                cards={getCardsForArea("paint")}
                areaId="paint"
                onCardMove={handleCardMove}
                className="border-2 border-dashed border-purple-500 bg-purple-100 dark:bg-purple-950/30"
              />
              
              {/* Electrical Pre-Assembly */}
              <BuildAreaZone
                title="ELECTRICAL PRE-ASSEMBLY"
                cards={getCardsForArea("electrical-pre")}
                areaId="electrical-pre"
                onCardMove={handleCardMove}
                className="border-2 border-dashed border-black bg-white dark:bg-gray-900"
              />
              
              {/* Mechanical Pre-Assembly */}
              <BuildAreaZone
                title="MECHANICAL PRE-ASSEMBLY"
                cards={getCardsForArea("mechanical-pre")}
                areaId="mechanical-pre"
                onCardMove={handleCardMove}
                className="border-2 border-dashed border-black bg-white dark:bg-gray-900"
              />
            </div>

            {/* Middle Section with Aisle Way Label */}
            <div className="col-span-12 flex items-center justify-center bg-gradient-to-r from-yellow-300 to-yellow-400 h-12 rounded-lg">
              <h3 className="text-xl font-bold text-black">AISLE WAY</h3>
            </div>

            {/* Main Floor Layout */}
            <div className="col-span-12 grid grid-cols-12 gap-4 flex-1">
              
              {/* Left Side - Sub Assembly Areas (Vertical Stack) */}
              <div className="col-span-5 grid grid-rows-6 gap-2">
                {[6, 5, 4, 3, 2, 1].map(areaNum => (
                  <BuildAreaZone
                    key={areaNum}
                    title={`SUB ASSY AREA ${areaNum}`}
                    cards={getCardsForArea("sub-assy", areaNum)}
                    areaId={`sub-assy-${areaNum}`}
                    onCardMove={handleCardMove}
                    className="border-2 border-blue-500 bg-blue-100 dark:bg-blue-950/30 text-xs"
                  />
                ))}
              </div>

              {/* Center Aisle Way Divider */}
              <div className="col-span-1 flex items-center justify-center">
                <div className="h-full w-full bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-lg flex items-center justify-center">
                  <div className="transform -rotate-90 text-black font-bold text-lg whitespace-nowrap">
                    AISLE WAY
                  </div>
                </div>
              </div>

              {/* Center-Right - Building Area */}
              <div className="col-span-2">
                <BuildAreaZone
                  title="BUILDING AREA"
                  cards={getCardsForArea("building")}
                  areaId="building"
                  onCardMove={handleCardMove}
                  className="border-2 border-dashed border-red-400 bg-red-50 dark:bg-red-950/20 h-full"
                />
              </div>

              {/* Right Side - Turbo 505 Machine Image */}
              <div className="col-span-4 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-gray-300">
                <img 
                  src={turboImage} 
                  alt="Turbo 505 Machine" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}