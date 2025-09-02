import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Table, Save, Package, AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, Zap } from "lucide-react";
import { useAssemblyCards, useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUser, canAccess } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import SwimLane from "@/components/swim-lane";
import GanttTable from "@/components/gantt-table";
import AssemblyCardModal from "@/components/assembly-card-modal";
import AssemblyDetailView from "@/components/assembly-detail-view";
import DependencyLegend from "@/components/dependency-legend";
import DeadTimeSource from "@/components/dead-time-source";
import { AssemblyCard } from "@shared/schema";

export default function Scheduler() {
  const { currentUser } = useUser();
  const [currentView, setCurrentView] = useState<"schedule" | "gantt">("schedule");
  const [selectedCard, setSelectedCard] = useState<AssemblyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailCard, setSelectedDetailCard] = useState<AssemblyCard | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeLanes, setActiveLanes] = useState<string[]>([]); // Track active swim lane assembler IDs
  const [newLaneAssembler, setNewLaneAssembler] = useState<string>(""); // Selected assembler for new lane
  const { toast } = useToast();
  const { startDate, setStartDate, startTime, setStartTime } = useUser();
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();
  const updateCardMutation = useUpdateAssemblyCard();
  
  // Initialize active lanes with all assemblers when data is loaded (only once)
  useEffect(() => {
    if (assemblers.length > 0 && activeLanes.length === 0) {
      // Only initialize if we don't have any saved configuration
      const savedLanes = localStorage.getItem('swimLanes');
      if (savedLanes) {
        try {
          const parsed = JSON.parse(savedLanes);
          // Filter to only include assemblers that still exist
          const validLanes = parsed.filter((id: string) => assemblers.some(a => a.id === id));
          setActiveLanes(validLanes);
        } catch {
          // If parsing fails, fall back to all assemblers
          setActiveLanes(assemblers.map(a => a.id));
        }
      } else {
        setActiveLanes(assemblers.map(a => a.id));
      }
    }
  }, [assemblers]);

  // Save active lanes to localStorage whenever they change
  useEffect(() => {
    if (activeLanes.length > 0) {
      localStorage.setItem('swimLanes', JSON.stringify(activeLanes));
    }
  }, [activeLanes]);
  
  // Functions to manage swim lanes
  const addSwimLane = () => {
    if (newLaneAssembler && !activeLanes.includes(newLaneAssembler)) {
      setActiveLanes([...activeLanes, newLaneAssembler]);
      setNewLaneAssembler("");
      toast({
        title: "Swim Lane Added",
        description: "New swim lane has been added to the schedule.",
      });
    }
  };
  
  const removeSwimLane = (assemblerId: string) => {
    setActiveLanes(activeLanes.filter(id => id !== assemblerId));
    toast({
      title: "Swim Lane Removed",
      description: "Swim lane has been removed from the schedule.",
    });
  };

  // Reordering functions
  const moveSwimLane = (fromIndex: number, toIndex: number) => {
    const newLanes = [...activeLanes];
    const [removed] = newLanes.splice(fromIndex, 1);
    newLanes.splice(toIndex, 0, removed);
    setActiveLanes(newLanes);
  };

  const moveSwimLaneUp = (assemblerId: string) => {
    const index = activeLanes.indexOf(assemblerId);
    if (index > 0) {
      moveSwimLane(index, index - 1);
    }
  };

  const moveSwimLaneDown = (assemblerId: string) => {
    const index = activeLanes.indexOf(assemblerId);
    if (index < activeLanes.length - 1) {
      moveSwimLane(index, index + 1);
    }
  };

  // Save swim lane configuration
  const saveSwimLaneConfiguration = () => {
    if (activeLanes.length > 0) {
      localStorage.setItem('swimLanes', JSON.stringify(activeLanes));
      toast({
        title: "Configuration Saved",
        description: "Your swim lane configuration has been saved and will persist when you reload the app.",
      });
    } else {
      toast({
        title: "No Configuration to Save",
        description: "Please add some swim lanes before saving.",
        variant: "destructive"
      });
    }
  };
  
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
    
    // Check if current time is within work hours (6 AM to 3 PM CT)
    const currentHour = centralTime.getHours();
    const currentMinutes = centralTime.getMinutes();
    
    // Hide line if outside work hours (before 6 AM or after 3 PM)
    if (currentHour < 6 || currentHour >= 15) {
      return null;
    }
    
    // Calculate time position within the day (6am = 0px, each hour = 60px)
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

  // Complex optimization algorithm for build sequence
  const optimizeBuildSequence = async () => {
    try {
      // Filter out DEAD_TIME cards for optimization - they'll be added back later
      const regularCards = assemblyCards.filter(card => card.type !== "DEAD_TIME");
      const deadTimeCards = assemblyCards.filter(card => card.type === "DEAD_TIME");
      
      // Step 1: Create dependency graph and validate it
      const dependencyGraph = new Map();
      const inDegree = new Map();
      
      regularCards.forEach(card => {
        dependencyGraph.set(card.id, []);
        inDegree.set(card.id, 0);
      });
      
      // Build the graph
      regularCards.forEach(card => {
        if (card.dependencies) {
          card.dependencies.forEach(depCardNumber => {
            const depCard = regularCards.find(c => c.cardNumber === depCardNumber);
            if (depCard) {
              dependencyGraph.get(depCard.id).push(card.id);
              inDegree.set(card.id, inDegree.get(card.id) + 1);
            }
          });
        }
      });
      
      // Step 2: Topological sort to get valid order respecting dependencies
      const sorted = [];
      const queue = [];
      
      // Find all cards with no dependencies
      inDegree.forEach((degree, cardId) => {
        if (degree === 0) {
          queue.push(cardId);
        }
      });
      
      while (queue.length > 0) {
        const currentId = queue.shift();
        sorted.push(currentId);
        
        // Process all cards that depend on this one
        dependencyGraph.get(currentId).forEach(dependentId => {
          inDegree.set(dependentId, inDegree.get(dependentId) - 1);
          if (inDegree.get(dependentId) === 0) {
            queue.push(dependentId);
          }
        });
      }
      
      // Check for circular dependencies
      if (sorted.length !== regularCards.length) {
        toast({
          title: "Optimization Failed",
          description: "Circular dependencies detected. Please fix dependencies before optimizing.",
          variant: "destructive",
        });
        return;
      }
      
      // Step 3: Group cards by assembler type compatibility
      const getCompatibleAssemblers = (cardType: string) => {
        return assemblers.filter(assembler => {
          switch (cardType) {
            case "M": return assembler.type === "mechanical";
            case "E": return assembler.type === "electrical";
            case "S": case "P": return ["mechanical", "electrical"].includes(assembler.type);
            case "KB": return true; // Kanban can go anywhere
            default: return true;
          }
        });
      };
      
      // Step 4: Calculate original positions for minimal movement
      const originalPositions = new Map();
      regularCards.forEach(card => {
        const assembler = assemblers.find(a => a.id === card.assignedTo);
        if (assembler) {
          const laneIndex = activeLanes.indexOf(assembler.id);
          const cardsInLane = regularCards.filter(c => c.assignedTo === assembler.id);
          const cardIndex = cardsInLane.findIndex(c => c.id === card.id);
          originalPositions.set(card.id, { laneIndex, cardIndex });
        }
      });
      
      // Step 5: Optimize assignment using a simplified scheduling algorithm
      const optimizedCards = [];
      const assemblerWorkload = new Map();
      const assemblerSchedule = new Map();
      
      // Initialize assembler schedules
      activeLanes.forEach(assemblerId => {
        assemblerWorkload.set(assemblerId, 0);
        assemblerSchedule.set(assemblerId, []);
      });
      
      // Process cards in dependency order
      sorted.forEach(cardId => {
        const card = regularCards.find(c => c.id === cardId);
        if (!card) return;
        
        const compatibleAssemblers = getCompatibleAssemblers(card.type);
        const availableAssemblers = compatibleAssemblers.filter(a => activeLanes.includes(a.id));
        
        if (availableAssemblers.length === 0) {
          // No compatible assemblers, keep original assignment
          optimizedCards.push(card);
          return;
        }
        
        // Find the best assembler considering:
        // 1. Least workload
        // 2. Minimal movement from original position
        let bestAssembler = null;
        let bestScore = Infinity;
        
        availableAssemblers.forEach(assembler => {
          const currentWorkload = assemblerWorkload.get(assembler.id) || 0;
          const originalPos = originalPositions.get(card.id);
          const newLaneIndex = activeLanes.indexOf(assembler.id);
          
          // Calculate movement penalty (favor keeping cards in same or nearby lanes)
          const movementPenalty = originalPos ? Math.abs(originalPos.laneIndex - newLaneIndex) * 2 : 0;
          
          // Calculate score (lower is better)
          const score = currentWorkload + movementPenalty;
          
          if (score < bestScore) {
            bestScore = score;
            bestAssembler = assembler;
          }
        });
        
        if (bestAssembler) {
          // Update the card assignment
          const optimizedCard = { ...card, assignedTo: bestAssembler.id };
          optimizedCards.push(optimizedCard);
          
          // Update assembler workload
          assemblerWorkload.set(bestAssembler.id, assemblerWorkload.get(bestAssembler.id) + card.duration);
          assemblerSchedule.get(bestAssembler.id).push(optimizedCard);
        } else {
          optimizedCards.push(card);
        }
      });
      
      // Step 6: Apply the optimized assignments
      let successCount = 0;
      for (const card of optimizedCards) {
        try {
          // Only send the fields that are actually being changed for optimization
          const updateData = {
            id: card.id,
            assignedTo: card.assignedTo
          };
          
          await updateCardMutation.mutateAsync(updateData);
          successCount++;
        } catch (error) {
          console.error(`Failed to update card ${card.cardNumber}:`, error);
        }
      }
      
      // Step 7: Show results
      const totalCards = optimizedCards.length;
      const movedCards = optimizedCards.filter(card => {
        const original = assemblyCards.find(c => c.id === card.id);
        return original && original.assignedTo !== card.assignedTo;
      }).length;
      
      toast({
        title: "Build Sequence Optimized",
        description: `Successfully optimized ${successCount}/${totalCards} cards. ${movedCards} cards were reassigned to minimize total build time while respecting dependencies.`,
        duration: 5000,
      });
      
    } catch (error) {
      console.error("Optimization failed:", error);
      toast({
        title: "Optimization Failed",
        description: "An error occurred during optimization. Please try again.",
        variant: "destructive",
      });
    }
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
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium" 
              onClick={optimizeBuildSequence}
              data-testid="button-optimize"
            >
              <Zap className="mr-2 h-4 w-4" />
              Optimize Build Sequence
            </Button>
            <Button 
              className="bg-success hover:bg-success/90 text-white font-medium" 
              onClick={saveSwimLaneConfiguration}
              data-testid="button-save"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
        
        {/* Secondary Controls Row */}
        <div className="flex items-center justify-end space-x-3 mt-3 pt-3 border-t border-border">
          {/* Dead Time Source */}
          <div className="border-r border-border pr-3">
            <DeadTimeSource />
          </div>

          {/* Swim Lane Management */}
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Add Lane:</Label>
            <Select value={newLaneAssembler} onValueChange={setNewLaneAssembler}>
              <SelectTrigger className="w-40" data-testid="select-new-lane-assembler">
                <SelectValue placeholder="Select assembler" />
              </SelectTrigger>
              <SelectContent>
                {assemblers
                  .filter(assembler => !activeLanes.includes(assembler.id))
                  .map(assembler => (
                    <SelectItem key={assembler.id} value={assembler.id}>
                      {assembler.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={addSwimLane}
              disabled={!newLaneAssembler}
              data-testid="button-add-lane"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Lane
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
                {activeLanes.map((assemblerId, index) => {
                  const assembler = assemblers.find(a => a.id === assemblerId);
                  if (!assembler) return null;
                  
                  return (
                    <div key={assembler.id} className="relative group">
                      <SwimLane
                        assembler={assembler}
                        assemblyCards={assemblyCards.filter(card => {
                          const baseCards = card.assignedTo === assembler.id;
                          return baseCards;
                        })}
                        allAssemblyCards={assemblyCards}
                        onCardEdit={handleCardEdit}
                        onCardView={handleCardView}
                        startTimeOffset={getStartTimeOffset()}
                        isCardOverdue={isCardOverdue}
                        data-testid={`swim-lane-${assembler.id}`}
                      />
                      
                      {/* Lane Controls - visible on hover */}
                      <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col space-y-1">
                        {/* Reorder Up Button */}
                        {index > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 bg-white/80 hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                            onClick={() => moveSwimLaneUp(assembler.id)}
                            data-testid={`button-move-up-${assembler.id}`}
                            title="Move lane up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Reorder Down Button */}
                        {index < activeLanes.length - 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 bg-white/80 hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                            onClick={() => moveSwimLaneDown(assembler.id)}
                            data-testid={`button-move-down-${assembler.id}`}
                            title="Move lane down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        )}
                        
                        {/* Delete Lane Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 bg-white/80 hover:bg-red-50 text-red-600 hover:text-red-700"
                          onClick={() => removeSwimLane(assembler.id)}
                          data-testid={`button-delete-lane-${assembler.id}`}
                          title="Remove lane"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
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
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold">Assembly Card Details Editor</h2>
                <div className="text-sm text-muted-foreground mt-1">
                  Current Time: {getCurrentCentralTime().toLocaleString('en-US', {
                    timeZone: 'America/Chicago',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </div>
              </div>
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
        onEdit={handleCardEdit}
      />

      {/* Dependency Legend */}
      <DependencyLegend />
    </div>
  );
}
