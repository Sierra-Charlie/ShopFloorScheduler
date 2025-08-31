import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [startDate, setStartDate] = useState("2025-09-08");
  const [startTime, setStartTime] = useState("08:00");
  
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();

  // Calculate business days (Mon-Fri) from start date
  const getBusinessDay = (startDateStr: string, dayOffset: number) => {
    const start = new Date(startDateStr);
    
    // For Day 1 (dayOffset 0), return the start date
    if (dayOffset === 0) {
      return start;
    }
    
    let current = new Date(start);
    let businessDaysAdded = 0;
    
    while (businessDaysAdded < dayOffset) {
      current.setDate(current.getDate() + 1);
      // Monday = 1, Friday = 5, Saturday = 6, Sunday = 0
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        businessDaysAdded++;
      }
    }
    
    return current;
  };

  const formatDayLabel = (dayIndex: number) => {
    // Use the same start date as Gantt view
    const date = getBusinessDay(startDate, dayIndex);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    return `Day ${dayIndex + 1} - ${dayName} ${formattedDate}`;
  };

  // Calculate start time offset in pixels (60px per hour)
  const getStartTimeOffset = () => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startHour = 6; // 6am is the leftmost position
    const hourOffset = hours - startHour + (minutes / 60);
    return Math.max(0, hourOffset * 60); // 60px per hour
  };

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
              <span className="font-semibold mr-2">Delivery Sequence:</span>
              <span className="phase-1 w-3 h-3 rounded"></span>
              <span>1</span>
              <span className="phase-2 w-3 h-3 rounded ml-4"></span>
              <span>2</span>
              <span className="phase-3 w-3 h-3 rounded ml-4"></span>
              <span>3</span>
              <span className="phase-4 w-3 h-3 rounded ml-4"></span>
              <span>4</span>
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
          {/* Shared scroll container for header and content */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Time Header - sticky within the scroll container */}
              <div className="bg-card border-b border-border px-6 py-3 sticky top-0 z-30">
                <div className="flex items-center space-x-4">
                  <div className="w-48 font-semibold text-sm">Assembler</div>
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-medium text-muted-foreground border-l border-border"
                      style={{ width: '540px' }}
                    >
                      <div>{formatDayLabel(i)}</div>
                      <div className="flex mt-1 text-[10px]" style={{ justifyContent: 'space-between', paddingRight: '60px' }}>
                        <span>6a</span><span>7a</span><span>8a</span><span>9a</span><span>10a</span><span>11a</span><span>12p</span><span>1p</span><span>2p</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Swim Lanes Container */}
              <div className="time-grid">
                {assemblers.map((assembler) => (
                  <SwimLane
                    key={assembler.id}
                    assembler={assembler}
                    assemblyCards={assemblyCards.filter(card => card.assignedTo === assembler.id)}
                    onCardEdit={handleCardEdit}
                    startTimeOffset={getStartTimeOffset()}
                    data-testid={`swim-lane-${assembler.id}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gantt View */}
      {currentView === "gantt" && (
        <div className="flex flex-col h-screen">
          {/* Gantt Header with Start Date Input */}
          <div className="bg-card border-b border-border p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Assembly Card Details Editor</h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Assembly Build Start Date:
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="start-time" className="text-sm font-medium">
                    Start Time:
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <GanttTable
              assemblyCards={assemblyCards}
              assemblers={assemblers}
              onCardEdit={handleCardEdit}
            />
          </div>
        </div>
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
