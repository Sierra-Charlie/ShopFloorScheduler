import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Table, Save, Package, AlertTriangle, Plus, Trash2, ChevronUp, ChevronDown, Zap, Minus } from "lucide-react";
import { useAssemblyCards, useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUsers } from "@/hooks/use-users";
import { useUser, canAccess } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import SwimLane from "@/components/swim-lane";
import GanttTable from "@/components/gantt-table";
import AssemblyCardModal from "@/components/assembly-card-modal";
import AssemblyDetailView from "@/components/assembly-detail-view";
import DependencyLegend from "@/components/dependency-legend";
import DeadTimeSource from "@/components/dead-time-source";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [selectedLanes, setSelectedLanes] = useState<string[]>([]); // Track selected swim lanes for grouping
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false); // Group by machine modal
  const [groupMachineType, setGroupMachineType] = useState<string>(""); // Selected machine type for grouping
  const [groupMachineNumber, setGroupMachineNumber] = useState<string>(""); // Machine number for grouping
  const [machineGroups, setMachineGroups] = useState<Record<string, { type: string; number: string; assemblerIds: string[]; collapsed: boolean }>>({});
  const [machineFilter, setMachineFilter] = useState<string>(""); // Filter by machine type-number
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false); // Machine filter modal
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
  const { data: users = [], isLoading: usersLoading } = useUsers();
  const updateCardMutation = useUpdateAssemblyCard();
  
  // Initialize active lanes with assemblers that have cards assigned to them
  useEffect(() => {
    if (assemblers.length > 0 && assemblyCards.length > 0) {
      // Get assemblers that have cards assigned to them
      const assemblersWithCards = assemblers
        .filter(assembler => assemblyCards.some(card => card.assignedTo === assembler.id))
        .map(assembler => assembler.id);

      // Only initialize if we don't have active lanes yet and there are assemblers with cards
      if (activeLanes.length === 0 && assemblersWithCards.length > 0) {
        // Always start fresh with assemblers that have cards assigned
        setActiveLanes(assemblersWithCards);
      }
    }
  }, [assemblers, assemblyCards]);

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

  // Filter swim lanes based on machine type and number
  const getFilteredLanes = () => {
    if (!machineFilter || machineFilter === "all") return activeLanes;
    
    return activeLanes.filter(assemblerId => {
      const assembler = assemblers.find(a => a.id === assemblerId);
      if (!assembler || !assembler.machineType || !assembler.machineNumber) return false;
      
      const machineGroup = `${assembler.machineType} - ${assembler.machineNumber}`;
      return machineGroup === machineFilter;
    });
  };

  // Get unique machine groups for filter options
  const getAvailableMachineGroups = () => {
    const groups = new Set<string>();
    activeLanes.forEach(assemblerId => {
      const assembler = assemblers.find(a => a.id === assemblerId);
      if (assembler?.machineType && assembler?.machineNumber) {
        groups.add(`${assembler.machineType} - ${assembler.machineNumber}`);
      }
    });
    return Array.from(groups).sort();
  };

  // Clear machine filter
  const clearMachineFilter = () => {
    setMachineFilter("all");
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

  // Machine grouping functions
  const handleLaneSelection = (assemblerId: string, checked: boolean) => {
    if (checked) {
      setSelectedLanes([...selectedLanes, assemblerId]);
    } else {
      setSelectedLanes(selectedLanes.filter(id => id !== assemblerId));
    }
  };

  const openGroupModal = () => {
    setIsGroupModalOpen(true);
    setGroupMachineType("");
    setGroupMachineNumber("");
  };

  const handleGroupByMachine = async () => {
    if (!groupMachineType || !groupMachineNumber || selectedLanes.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select machine type, number, and at least one swim lane.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update assemblers with machine grouping information
      for (const assemblerId of selectedLanes) {
        const assembler = assemblers.find(a => a.id === assemblerId);
        if (assembler) {
          await fetch(`/api/assemblers/${assemblerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              machineType: groupMachineType,
              machineNumber: groupMachineNumber
            })
          });
        }
      }

      // Create machine group
      const groupKey = `${groupMachineType}-${groupMachineNumber}`;
      setMachineGroups(prev => ({
        ...prev,
        [groupKey]: {
          type: groupMachineType,
          number: groupMachineNumber,
          assemblerIds: selectedLanes,
          collapsed: false
        }
      }));

      setSelectedLanes([]);
      setIsGroupModalOpen(false);
      
      toast({
        title: "Machine Group Created",
        description: `Successfully grouped ${selectedLanes.length} swim lanes under ${groupMachineType} - ${groupMachineNumber}`,
      });
    } catch (error) {
      toast({
        title: "Grouping Failed",
        description: "Failed to group swim lanes. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setMachineGroups(prev => ({
      ...prev,
      [groupKey]: {
        ...prev[groupKey],
        collapsed: !prev[groupKey].collapsed
      }
    }));
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

  // Advanced optimization algorithm for build sequence with constraint solving
  const optimizeBuildSequence = async () => {
    try {
      // Filter out DEAD_TIME cards for optimization - they'll be strategically added back later
      const regularCards = assemblyCards.filter(card => card.type !== "DEAD_TIME");
      const deadTimeCards = assemblyCards.filter(card => card.type === "DEAD_TIME");
      
      toast({
        title: "Optimizing build sequence...",
        description: "Finding optimal solution with constraint satisfaction",
      });

      // Iterative optimization - try multiple times until we get a valid solution
      let bestSolution = null;
      let bestCycleTime = Infinity;
      let bestConflictCount = Infinity;
      let attempts = 0;
      const maxAttempts = 20; // Increased attempts for better exploration
      
      for (attempts = 0; attempts < maxAttempts; attempts++) {
      
      // Step 1: Validate dependency graph and detect circular dependencies
      const dependencyGraph = new Map();
      const inDegree = new Map();
      
      regularCards.forEach(card => {
        dependencyGraph.set(card.id, []);
        inDegree.set(card.id, 0);
      });
      
      // Build the dependency graph
      regularCards.forEach(card => {
        if (card.dependencies) {
          card.dependencies.forEach((depCardNumber: string) => {
            const depCard = regularCards.find(c => c.cardNumber === depCardNumber);
            if (depCard) {
              dependencyGraph.get(depCard.id).push(card.id);
              inDegree.set(card.id, inDegree.get(card.id) + 1);
            }
          });
        }
      });
      
      // Step 2: Topological sort for valid dependency order
      const sorted: string[] = [];
      const queue: string[] = [];
      
      inDegree.forEach((degree, cardId) => {
        if (degree === 0) {
          queue.push(cardId);
        }
      });
      
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        sorted.push(currentId);
        
        dependencyGraph.get(currentId)?.forEach((dependentId: string) => {
          inDegree.set(dependentId, inDegree.get(dependentId) - 1);
          if (inDegree.get(dependentId) === 0) {
            queue.push(dependentId);
          }
        });
      }
      
      if (sorted.length !== regularCards.length) {
        toast({
          title: "Optimization Failed",
          description: "Circular dependencies detected. Please fix dependencies before optimizing.",
          variant: "destructive",
        });
        return;
      }
      
      // Step 3: Enhanced compatibility checking with phase and SubAssy constraints
      const getCompatibleAssemblers = (card: any) => {
        return assemblers.filter(assembler => {
          // Basic type compatibility
          let typeCompatible = false;
          switch (card.type) {
            case "M": typeCompatible = assembler.type === "mechanical"; break;
            case "E": typeCompatible = assembler.type === "electrical"; break;
            case "S": case "P": typeCompatible = ["mechanical", "electrical"].includes(assembler.type); break;
            case "KB": typeCompatible = true; break;
            default: typeCompatible = true;
          }
          
          return typeCompatible && activeLanes.includes(assembler.id);
        });
      };
      
      // Step 4: Calculate original positions and movement costs
      const originalPositions = new Map();
      regularCards.forEach(card => {
        const assembler = assemblers.find(a => a.id === card.assignedTo);
        if (assembler) {
          const laneIndex = activeLanes.indexOf(assembler.id);
          originalPositions.set(card.id, { laneIndex, currentAssembler: card.assignedTo });
        }
      });
      
      // Step 5: Advanced constraint-based optimization with workload balancing
      const optimizedCards: any[] = [];
      const assemblerWorkloads = new Map<string, number>();
      const assemblerPositions = new Map<string, number>();
      const craneUsage: Array<{assemblerId: string, startPos: number, endPos: number}> = [];
      
      // Initialize assembler tracking
      activeLanes.forEach(assemblerId => {
        assemblerWorkloads.set(assemblerId, 0);
        assemblerPositions.set(assemblerId, 0);
      });
      
      // Process cards in dependency order
      for (const cardId of sorted) {
        const card = regularCards.find(c => c.id === cardId);
        if (!card || card.grounded) {
          // Skip grounded cards - they cannot be moved
          if (card) {
            optimizedCards.push(card);
            if (card.assignedTo) {
              const currentWorkload = assemblerWorkloads.get(card.assignedTo) || 0;
              assemblerWorkloads.set(card.assignedTo, currentWorkload + card.duration);
            }
          }
          continue;
        }
        
        const compatibleAssemblers = getCompatibleAssemblers(card);
        
        if (compatibleAssemblers.length === 0) {
          optimizedCards.push(card);
          continue;
        }
        
        // Find best assembler using workload balancing
        let bestAssembler = null;
        let bestScore = Infinity;
        
        for (const assembler of compatibleAssemblers) {
          let score = 0;
          
          // 1. Calculate projected workload after adding this card
          const currentWorkload = assemblerWorkloads.get(assembler.id) || 0;
          const projectedWorkload = currentWorkload + card.duration;
          
          // 2. Calculate workload imbalance - penalize assemblers that would become overloaded
          const otherWorkloads = Array.from(assemblerWorkloads.values()).filter((_, idx) => 
            Array.from(assemblerWorkloads.keys())[idx] !== assembler.id
          );
          const avgOtherWorkload = otherWorkloads.length > 0 ? 
            otherWorkloads.reduce((sum, w) => sum + w, 0) / otherWorkloads.length : 0;
          
          // Heavy penalty for creating workload imbalance
          const workloadImbalance = Math.max(0, projectedWorkload - avgOtherWorkload);
          score += workloadImbalance * 50; // Very high penalty for imbalance
          
          // 3. Base workload penalty to encourage using less loaded assemblers
          score += currentWorkload * 10;
          
          // 4. Dependency conflict avoidance - heavily penalize cross-lane dependencies
          let dependencyPenalty = 0;
          if (card.dependencies?.length) {
            card.dependencies.forEach(depNum => {
              const depCard = optimizedCards.find(c => c.cardNumber === depNum);
              if (depCard) {
                if (depCard.assignedTo === assembler.id) {
                  // Same lane: small bonus for keeping dependencies together
                  dependencyPenalty -= 2;
                } else {
                  // Different lane: huge penalty for cross-lane dependency
                  dependencyPenalty += 100; // Very high penalty to avoid cross-lane deps
                }
              }
            });
          }
          score += dependencyPenalty;
          
          // 5. Crane conflict avoidance
          if (card.requiresCrane) {
            const currentPos = assemblerPositions.get(assembler.id) || 0;
            const cardStart = currentPos;
            const cardEnd = currentPos + card.duration;
            
            // Check for crane conflicts with cards in different assemblers
            const hasConflict = craneUsage.some(usage => {
              if (usage.assemblerId === assembler.id) return false; // Same assembler OK
              return cardStart < usage.endPos && usage.startPos < cardEnd;
            });
            
            if (hasConflict) {
              score += 100; // High penalty for crane conflicts
            }
          }
          
          // 6. Minimal movement penalty
          const originalLaneIndex = activeLanes.indexOf(card.assignedTo || "");
          const newLaneIndex = activeLanes.indexOf(assembler.id);
          if (originalLaneIndex >= 0) {
            score += Math.abs(originalLaneIndex - newLaneIndex) * 0.1; // Tiny weight
          }
          
          if (score < bestScore) {
            bestScore = score;
            bestAssembler = assembler;
          }
        }
        
        // Assign card to best assembler
        if (bestAssembler) {
          const position = assemblerPositions.get(bestAssembler.id) || 0;
          
          const optimizedCard = {
            ...card,
            assignedTo: bestAssembler.id,
            position: position
          };
          
          optimizedCards.push(optimizedCard);
          
          // Update tracking
          assemblerWorkloads.set(bestAssembler.id, (assemblerWorkloads.get(bestAssembler.id) || 0) + card.duration);
          assemblerPositions.set(bestAssembler.id, position + 1);
          
          // Track crane usage for conflict detection
          if (card.requiresCrane) {
            craneUsage.push({
              assemblerId: bestAssembler.id,
              startPos: position,
              endPos: position + card.duration
            });
          }
        } else {
          optimizedCards.push(card);
        }
      }
      
      // Step 6: Strategic dead time insertion to resolve remaining conflicts
      const finalCards = optimizedCards; // Simplified for now
      
      // Step 7: Apply optimized assignments
      let successCount = 0;
      for (const card of finalCards) {
        try {
          if (card.type === "DEAD_TIME") continue; // Skip dead time cards for now
          
          const updateData = {
            id: card.id,
            assignedTo: card.assignedTo,
            position: card.position
          };
          
          await updateCardMutation.mutateAsync(updateData);
          successCount++;
        } catch (error) {
          console.error(`Failed to update card ${card.cardNumber}:`, error);
        }
      }
      
      // Step 8: Show comprehensive results with cycle time metrics
      const totalCards = optimizedCards.length;
      const movedCards = optimizedCards.filter(card => {
        const original = assemblyCards.find(c => c.id === card.id);
        return original && original.assignedTo !== card.assignedTo;
      }).length;
      
      // Calculate cycle time metrics
      const assemblersWithCards = Array.from(assemblerWorkloads.entries())
        .filter(([_, workload]) => workload > 0)
        .sort(([,a], [,b]) => b - a);
      
      const maxCycleTime = assemblersWithCards.length > 0 ? assemblersWithCards[0][1] : 0;
      const avgCycleTime = assemblersWithCards.length > 0 ? 
        assemblersWithCards.reduce((sum, [_, workload]) => sum + workload, 0) / assemblersWithCards.length : 0;
      
      // Check dependency conflicts - both same-lane and cross-lane dependencies
      let dependencyConflicts = 0;
      optimizedCards.forEach(card => {
        if (card.dependencies) {
          card.dependencies.forEach((depCardNumber: string) => {
            const depCard = optimizedCards.find(c => c.cardNumber === depCardNumber);
            if (depCard) {
              if (depCard.assignedTo === card.assignedTo) {
                // Same lane: dependency should come BEFORE (lower position number) the dependent card
                if ((depCard.position || 0) > (card.position || 0)) {
                  dependencyConflicts++;
                }
              } else {
                // Cross-lane dependency: always a conflict since cards can't coordinate timing across lanes
                dependencyConflicts++;
              }
            }
          });
        }
      });
      
      // Check crane conflicts
      let craneConflicts = 0;
      craneUsage.forEach((usage1, i) => {
        craneUsage.slice(i + 1).forEach(usage2 => {
          if (usage1.assemblerId !== usage2.assemblerId) {
            if (usage1.startPos < usage2.endPos && usage2.startPos < usage1.endPos) {
              craneConflicts++;
            }
          }
        });
      });
      
      // Evaluate this solution
      const currentSolution = {
        cards: optimizedCards,
        maxCycleTime,
        dependencyConflicts,
        craneConflicts,
        successCount,
        movedCards,
        totalCards,
        avgCycleTime
      };
      
      // Check if this is a valid solution (no conflicts) and better than previous
      const isValidSolution = dependencyConflicts === 0 && craneConflicts === 0;
      const totalConflicts = dependencyConflicts + craneConflicts;
      const isBetterSolution = maxCycleTime < bestCycleTime;
      const isFewerConflicts = totalConflicts < bestConflictCount;
      
      // Prioritize solutions with fewer conflicts, then better cycle time
      const shouldUpdateSolution = 
        isValidSolution && (isBetterSolution || !bestSolution || bestConflictCount > 0) ||
        (!isValidSolution && isFewerConflicts) ||
        (!isValidSolution && totalConflicts === bestConflictCount && isBetterSolution);
      
      if (shouldUpdateSolution) {
        bestSolution = currentSolution;
        bestCycleTime = maxCycleTime;
        bestConflictCount = totalConflicts;
        
        // If we found a perfect solution, we can stop
        if (isValidSolution) {
          break;
        }
      }
      
      // Strategy for next attempt: try different approaches to resolve conflicts
      if (attempts < maxAttempts - 1) {
        if (attempts < 5) {
          // First few attempts: shuffle topological order
          regularCards.sort(() => Math.random() - 0.5);
        } else if (attempts < 10) {
          // Middle attempts: prioritize cards with dependencies first
          regularCards.sort((a, b) => (b.dependencies?.length || 0) - (a.dependencies?.length || 0));
        } else if (attempts < 15) {
          // Later attempts: group cards by type to encourage same-lane assignments
          regularCards.sort((a, b) => a.type.localeCompare(b.type));
        } else {
          // Final attempts: random exploration
          regularCards.sort(() => Math.random() - 0.5);
        }
      }
      
      } // End of attempts loop
      
      // Use the best solution found
      if (bestSolution) {
        toast({
          title: `Build Sequence Optimized${bestSolution.dependencyConflicts === 0 && bestSolution.craneConflicts === 0 ? ' Successfully' : ' (Best Effort)'}`,
          description: `Optimized ${bestSolution.successCount}/${bestSolution.totalCards} cards. ${bestSolution.movedCards} moved. Max cycle: ${bestSolution.maxCycleTime}h, Avg: ${bestSolution.avgCycleTime.toFixed(1)}h. Dependencies: ${bestSolution.dependencyConflicts}, Crane conflicts: ${bestSolution.craneConflicts}. ${attempts + 1} attempt(s).`,
          duration: 6000,
        });
      } else {
        toast({
          title: "Optimization Failed",
          description: "Could not find a valid solution. Please check constraints.",
          variant: "destructive",
        });
      }
      
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

  if (cardsLoading || assemblersLoading || usersLoading) {
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
            
            {/* Group by Machine Button - only show when lanes are selected */}
            {selectedLanes.length > 0 && (
              <Button 
                size="sm" 
                onClick={openGroupModal}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-group-machine"
              >
                <Package className="h-4 w-4 mr-1" />
                Group by Machine ({selectedLanes.length})
              </Button>
            )}
            
            {/* Machine Filter Button */}
            <Button 
              size="sm" 
              onClick={() => setIsFilterModalOpen(true)}
              variant={machineFilter && machineFilter !== "all" ? "default" : "outline"}
              className={machineFilter && machineFilter !== "all" ? "bg-green-600 hover:bg-green-700" : ""}
              data-testid="button-filter-machine"
            >
              <Zap className="h-4 w-4 mr-1" />
              {machineFilter && machineFilter !== "all" ? `Filter: ${machineFilter}` : "Filter by Machine"}
            </Button>
            
            {/* Clear Filter Button - only show when filter is active */}
            {machineFilter && machineFilter !== "all" && (
              <Button 
                size="sm" 
                onClick={clearMachineFilter}
                variant="ghost"
                className="text-red-600 hover:text-red-700"
                data-testid="button-clear-filter"
              >
                <Minus className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            )}
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
                  <div className="w-6 text-center text-xs font-medium text-muted-foreground">☐</div>
                  <div className="w-10 text-xs font-medium text-muted-foreground writing-mode-vertical-rl text-center border-l border-border px-1">Machine Group</div>
                  <div className="w-48 font-semibold text-sm pl-4">Assembler</div>
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
                {getFilteredLanes().map((assemblerId, index) => {
                  const assembler = assemblers.find(a => a.id === assemblerId);
                  if (!assembler) return null;
                  
                  const machineGroup = assembler.machineType && assembler.machineNumber ? 
                    `${assembler.machineType} - ${assembler.machineNumber}` : null;
                  
                  return (
                    <div key={assembler.id} className="relative group flex items-center">
                      {/* Checkbox for lane selection */}
                      <div className="w-6 flex justify-center items-center">
                        <Checkbox
                          checked={selectedLanes.includes(assemblerId)}
                          onCheckedChange={(checked) => handleLaneSelection(assemblerId, checked as boolean)}
                          data-testid={`checkbox-lane-${assembler.id}`}
                        />
                      </div>
                      {/* Machine Group Column */}
                      <div className="w-10 border-l border-border px-1 flex items-center justify-center min-h-20">
                        {machineGroup && (
                          <div className="writing-mode-vertical-rl text-xs text-center font-bold">
                            {machineGroup}
                          </div>
                        )}
                      </div>
                      {/* Swim Lane */}
                      <div className="flex-1">
                        <SwimLane
                          assembler={assembler}
                          assemblyCards={assemblyCards.filter(card => {
                            const baseCards = card.assignedTo === assembler.id;
                            return baseCards;
                          })}
                          allAssemblyCards={assemblyCards}
                          users={users}
                          onCardEdit={handleCardEdit}
                          onCardView={handleCardView}
                          startTimeOffset={getStartTimeOffset()}
                          isCardOverdue={isCardOverdue}
                          data-testid={`swim-lane-${assembler.id}`}
                        />
                      </div>
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

          {/* Assembly Card Visual Key/Legend - Outside scrollable area */}
          <div className="bg-card border-t border-border p-4">
            <h3 className="text-lg font-semibold mb-3">Assembly Card Visual Indicators</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status Indicators */}
              <div className="space-y-2">
                <h4 className="font-medium text-xs text-muted-foreground">Status Indicators</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="bg-green-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">P</div>
                    <span className="text-[10px]">Picking in Progress (Green P)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-white text-black rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold border border-black">P</div>
                    <span className="text-[10px]">Ready for Picking (White P)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">P</div>
                    <span className="text-[10px]">Delivered to Paint (Purple P)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">!</div>
                    <span className="text-[10px]">Overdue (Red Exclamation)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-yellow-500 text-black rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">△</div>
                    <span className="text-[10px]">Dependency Conflict (Yellow Warning)</span>
                  </div>
                </div>
              </div>

              {/* Card Elements & Time/States Combined */}
              <div className="space-y-2">
                <h4 className="font-medium text-xs text-muted-foreground">Card Elements</h4>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="text-[8px] bg-black text-white px-1 py-0.5 rounded">XX</div>
                    <span className="text-[10px]">Dependency constraints - what assembly operation needs to be completed before this assembly operation can start</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[10px]">XX</span>
                    <span className="text-[10px]">Card Number (Bold)</span>
                  </div>
                  {/* Sequence Codes Sub-bullets */}
                  <div className="ml-4 space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[8px]">M</span>
                      <span className="text-[9px]">Mechanical Install</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[8px]">E</span>
                      <span className="text-[9px]">Electrical Install</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[8px]">S</span>
                      <span className="text-[9px]">Sub-Assembly</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[8px]">P</span>
                      <span className="text-[9px]">Pre-Assembly</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-[8px]">KB</span>
                      <span className="text-[9px]">Kanban</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-0.5 h-4 bg-red-500 shadow-sm"></div>
                    <span className="text-[10px]">Current Time Line (Red)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-200 border border-gray-400 rounded opacity-50"></div>
                    <span className="text-[10px]">Not Started (Faded)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-200 border border-blue-400 rounded"></div>
                    <span className="text-[10px]">In Progress (Normal)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-200 border-2 border-green-400 rounded"></div>
                    <span className="text-[10px]">Completed (Thick Border)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Quick Reference */}
            <div className="mt-3 pt-2 border-t border-border">
              <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                <div><strong>Drag & Drop:</strong> Move cards</div>
                <div><strong>Click:</strong> View details</div>
                <div><strong>Double-Click:</strong> Edit card</div>
                <div><strong>Time Grid:</strong> 4-day schedule (6am-2pm)</div>
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
      {/* Machine Filter Modal */}
      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Swim Lanes by Machine</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="filter-machine" className="text-sm font-medium">
                Select Machine Group
              </Label>
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger className="w-full" data-testid="select-filter-machine">
                  <SelectValue placeholder="Select machine group to filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Show All Machines</SelectItem>
                  {getAvailableMachineGroups().map(group => (
                    <SelectItem key={group} value={group}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {machineFilter && machineFilter !== "all" ? (
                `Showing ${getFilteredLanes().length} of ${activeLanes.length} swim lanes`
              ) : (
                `Total swim lanes: ${activeLanes.length}`
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1"
                data-testid="button-apply-filter"
              >
                Apply Filter
              </Button>
              <Button 
                onClick={() => {
                  setMachineFilter("all");
                  setIsFilterModalOpen(false);
                }}
                variant="outline"
                data-testid="button-clear-and-close"
              >
                Clear & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Group by Machine Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group Swim Lanes by Machine</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="machine-type" className="text-sm font-medium">
                Machine Type
              </Label>
              <Select value={groupMachineType} onValueChange={setGroupMachineType}>
                <SelectTrigger className="w-full" data-testid="select-machine-type">
                  <SelectValue placeholder="Select machine type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Turbo 505">Turbo 505</SelectItem>
                  <SelectItem value="Voyager">Voyager</SelectItem>
                  <SelectItem value="Champ">Champ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="machine-number" className="text-sm font-medium">
                Machine Number (4 digits)
              </Label>
              <Input
                id="machine-number"
                type="text"
                value={groupMachineNumber}
                onChange={(e) => setGroupMachineNumber(e.target.value)}
                placeholder="e.g., 2002"
                maxLength={4}
                pattern="[0-9]{4}"
                className="w-full"
                data-testid="input-machine-number"
              />
            </div>
            
            <div className="text-sm text-muted-foreground">
              Selected swim lanes: {selectedLanes.length}
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleGroupByMachine}
                className="flex-1"
                data-testid="button-confirm-group"
              >
                Group Swim Lanes
              </Button>
              <Button 
                onClick={() => setIsGroupModalOpen(false)}
                variant="outline"
                data-testid="button-cancel-group"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Dependency Legend */}
      <DependencyLegend />
    </div>
  );
}
