import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Table, Save, Package, AlertTriangle } from "lucide-react";
import { useAssemblyCards } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUser, canAccess } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import SwimLane from "@/components/swim-lane";
import GanttTable from "@/components/gantt-table";
import AssemblyCardModal from "@/components/assembly-card-modal";
import AssemblyDetailView from "@/components/assembly-detail-view";
import DependencyLegend from "@/components/dependency-legend";
import { AssemblyCard } from "@shared/schema";

export default function Scheduler() {
  const { currentUser } = useUser();
  const [currentView, setCurrentView] = useState<"schedule" | "gantt">("schedule");
  const [selectedCard, setSelectedCard] = useState<AssemblyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailCard, setSelectedDetailCard] = useState<AssemblyCard | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [startDate, setStartDate] = useState("2025-09-08");
  const [startTime, setStartTime] = useState("08:00");
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();
  
  // Utility function to get current time in Central Time Zone
  const getCurrentCentralTime = () => {
    return new Date(currentTime.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  };
  
  // Calculate position of current time line
  const getCurrentTimePosition = () => {
    const centralTime = getCurrentCentralTime();
    const currentDate = new Date(centralTime.getFullYear(), centralTime.getMonth(), centralTime.getDate());
    const startDateObj = new Date(startDate);
    
    // Calculate which day we're in relative to start date
    const daysDiff = Math.floor((currentDate.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    // If we're before start date or after our visible days, don't show line
    if (daysDiff < 0 || daysDiff >= 5) {
      return null;
    }
    
    // Calculate time position within the day (6am = 0px, each hour = 60px)
    const currentHour = centralTime.getHours();
    const currentMinutes = centralTime.getMinutes();
    const timeOffset = Math.max(0, (currentHour - 6) * 60 + currentMinutes); // 60px per hour
    
    // Calculate total position (day offset + time offset)
    const dayOffset = daysDiff * 540; // 540px per day
    return dayOffset + timeOffset;
  };
  
  // Check if assembly card is overdue
  const isCardOverdue = (card: AssemblyCard) => {
    if (card.status === 'completed') return false;
    
    const centralTime = getCurrentCentralTime();
    const currentTimePosition = getCurrentTimePosition();
    
    if (currentTimePosition === null || !card.startTime || !card.duration) return false;
    
    // Calculate card's expected end position
    const cardStart = new Date(card.startTime);
    const cardStartPosition = getCardTimePosition(cardStart);
    const cardEndPosition = cardStartPosition + (card.duration * 60); // duration in hours * 60px
    
    // Card is overdue if current time has passed its expected end
    return currentTimePosition > cardEndPosition;
  };
  
  // Helper to get time position for a given date
  const getCardTimePosition = (date: Date) => {
    const startDateObj = new Date(startDate);
    const daysDiff = Math.floor((date.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const timeOffset = Math.max(0, (date.getHours() - 6) * 60 + date.getMinutes());
    return daysDiff * 540 + timeOffset;
  };

  // Calculate business days (Mon-Fri) from start date
  const getBusinessDay = (startDateStr: string, dayOffset: number) => {
    // Parse date in local timezone to avoid UTC offset issues
    const [year, month, day] = startDateStr.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    
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

  const handleCardView = (card: AssemblyCard) => {
    setSelectedDetailCard(card);
    setIsDetailViewOpen(true);
  };
  
  // Check for overdue cards and send alerts
  useEffect(() => {
    const overdueCards = assemblyCards.filter(isCardOverdue);
    
    if (overdueCards.length > 0 && currentUser?.role === 'production_supervisor') {
      const overdueCardNumbers = overdueCards.map(card => card.cardNumber).join(', ');
      toast({
        title: "Assembly Cards Behind Schedule",
        description: `Cards ${overdueCardNumbers} are overdue and need attention`,
        variant: "destructive",
        duration: 10000,
      });
    }
  }, [assemblyCards, currentTime, toast, currentUser]);

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const handleDetailViewClose = () => {
    setIsDetailViewOpen(false);
    setSelectedDetailCard(null);
  };

  // Check if user has permission to access this view
  if (!currentUser || (!canAccess(currentUser, 'schedule_view') && !canAccess(currentUser, 'gantt_view'))) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access the Scheduler.</p>
        </div>
      </div>
    );
  }

  if (cardsLoading || assemblersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scheduler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-x-auto">

      {/* Toolbar */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
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
          <div className="flex items-center space-x-3">
            <Button className="bg-success hover:bg-success/90 text-white font-medium" data-testid="button-save">
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Summary View */}
      {currentView === "schedule" && (
        <div className="flex flex-col h-screen">
          {/* Shared scroll container for header and content */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Time Header - sticky within the scroll container */}
              <div className="bg-card border-b border-border px-6 py-3 sticky top-0 z-30">
                <div className="flex items-center">
                  <div className="w-48 font-semibold text-sm">Assembler</div>
                  {Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-medium text-muted-foreground border-l border-border"
                      style={{ width: '540px' }}
                    >
                      <div>{formatDayLabel(i)}</div>
                      <div className="flex mt-1 text-[10px]" style={{ justifyContent: 'space-between' }}>
                        <span>6a</span><span>7a</span><span>8a</span><span>9a</span><span>10a</span><span>11a</span><span>12p</span><span>1p</span><span>2p</span><span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Swim Lanes Container */}
              <div className="time-grid relative">
                {assemblers.map((assembler) => (
                  <SwimLane
                    key={assembler.id}
                    assembler={assembler}
                    assemblyCards={assemblyCards.filter(card => {
                      const baseCards = card.assignedTo === assembler.id;
                      return baseCards;
                    })}
                    onCardEdit={handleCardEdit}
                    onCardView={handleCardView}
                    startTimeOffset={getStartTimeOffset()}
                    isCardOverdue={isCardOverdue}
                    data-testid={`swim-lane-${assembler.id}`}
                  />
                ))}
                
                {/* Current Time Progress Line */}
                {(() => {
                  const timePosition = getCurrentTimePosition();
                  if (timePosition === null) return null;
                  
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                      style={{
                        left: `${240 + timePosition}px`, // 240px for assembler column width
                        boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
                      }}
                      data-testid="current-time-line"
                    >
                      {/* Time indicator tooltip */}
                      <div className="absolute -top-6 -left-8 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {getCurrentCentralTime().toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          timeZone: 'America/Chicago'
                        })} CT
                      </div>
                    </div>
                  );
                })()}
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
              onCardView={handleCardView}
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

      {/* Assembly Detail View */}
      <AssemblyDetailView
        card={selectedDetailCard}
        isOpen={isDetailViewOpen}
        onClose={handleDetailViewClose}
      />

      {/* Dependency Legend */}
      <DependencyLegend />
    </div>
  );
}
