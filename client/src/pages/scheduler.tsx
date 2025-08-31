import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Table, Save } from "lucide-react";
import { useAssemblyCards } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import SwimLane from "@/components/swim-lane";
import GanttTable from "@/components/gantt-table";
import AssemblyCardModal from "@/components/assembly-card-modal";
import DependencyLegend from "@/components/dependency-legend";
import { AssemblyCard } from "@shared/schema";

export default function Scheduler() {
  const [currentView, setCurrentView] = useState<"schedule" | "gantt">("schedule");
  const [selectedCard, setSelectedCard] = useState<AssemblyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();

  const handleCardEdit = (card: AssemblyCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  if (cardsLoading || assemblersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-foreground" data-testid="header-title">
              Manufacturing Shop Floor Scheduler
            </h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span className="phase-1 w-3 h-3 rounded"></span>
              <span>Phase 1</span>
              <span className="phase-2 w-3 h-3 rounded ml-4"></span>
              <span>Phase 2</span>
              <span className="phase-3 w-3 h-3 rounded ml-4"></span>
              <span>Phase 3</span>
              <span className="phase-4 w-3 h-3 rounded ml-4"></span>
              <span>Phase 4</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setCurrentView("schedule")}
              variant={currentView === "schedule" ? "default" : "secondary"}
              className="font-medium"
              data-testid="button-schedule-view"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Schedule View
            </Button>
            <Button
              onClick={() => setCurrentView("gantt")}
              variant={currentView === "gantt" ? "default" : "secondary"}
              className="font-medium"
              data-testid="button-gantt-view"
            >
              <Table className="mr-2 h-4 w-4" />
              Gantt View
            </Button>
            <Button className="bg-success hover:bg-success/90 text-white font-medium" data-testid="button-save">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Schedule Summary View */}
      {currentView === "schedule" && (
        <div className="flex flex-col h-screen">
          {/* Time Header */}
          <div className="bg-card border-b border-border px-6 py-3 sticky top-16 z-30">
            <div className="flex items-center space-x-4 min-w-max">
              <div className="w-48 font-semibold text-sm">Assembler</div>
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="w-60 text-center text-xs font-medium text-muted-foreground border-l border-border pl-2"
                >
                  <div>Week {i + 1}</div>
                  <div className="flex justify-between mt-1">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Swim Lanes Container */}
          <div className="flex-1 overflow-auto time-grid">
            {assemblers.map((assembler) => (
              <SwimLane
                key={assembler.id}
                assembler={assembler}
                assemblyCards={assemblyCards.filter(card => card.assignedTo === assembler.id)}
                onCardEdit={handleCardEdit}
                data-testid={`swim-lane-${assembler.id}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gantt View */}
      {currentView === "gantt" && (
        <GanttTable
          assemblyCards={assemblyCards}
          assemblers={assemblers}
          onCardEdit={handleCardEdit}
        />
      )}

      {/* Assembly Card Modal */}
      <AssemblyCardModal
        card={selectedCard}
        assemblers={assemblers}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />

      {/* Dependency Legend */}
      <DependencyLegend />
    </div>
  );
}
