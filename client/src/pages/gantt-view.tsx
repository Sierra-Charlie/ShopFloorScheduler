import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Table, Save, Package, Filter, X } from "lucide-react";
import { Link } from "wouter";
import { useAssemblyCards, useResetAllAssemblyCardStatus, useDeleteAllAssemblyCards } from "@/hooks/use-assembly-cards";
import { useAssemblers } from "@/hooks/use-assemblers";
import { useUser } from "@/contexts/user-context";
import { useToast } from "@/hooks/use-toast";
import GanttTable from "@/components/gantt-table";
import AssemblyCardModal from "@/components/assembly-card-modal";
import AssemblyDetailView from "@/components/assembly-detail-view";
import DependencyLegend from "@/components/dependency-legend";
import { FileUpload } from "@/components/file-upload";
import { AssemblyCard } from "@shared/schema";

export default function GanttView() {
  const [selectedCard, setSelectedCard] = useState<AssemblyCard | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailCard, setSelectedDetailCard] = useState<AssemblyCard | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { startDate, setStartDate, startTime, setStartTime } = useUser();
  
  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    type: [] as string[],
    phase: [] as string[],
    assignedTo: [] as string[],
    cardNumber: "",
  });
  
  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, []);
  
  // Utility function to get current time in Central Time Zone
  const getCurrentCentralTime = () => {
    return new Date(currentTime.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  };
  
  const { data: assemblyCards = [], isLoading: cardsLoading } = useAssemblyCards();
  const { data: assemblers = [], isLoading: assemblersLoading } = useAssemblers();
  const resetAllStatusMutation = useResetAllAssemblyCardStatus();
  const deleteAllCardsMutation = useDeleteAllAssemblyCards();
  const { toast } = useToast();

  // Filter the assembly cards based on current filters
  const filteredAssemblyCards = useMemo(() => {
    return assemblyCards.filter(card => {
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(card.status)) {
        return false;
      }
      
      // Type filter
      if (filters.type.length > 0 && !filters.type.includes(card.type)) {
        return false;
      }
      
      // Phase filter
      if (filters.phase.length > 0 && !filters.phase.includes(card.phase.toString())) {
        return false;
      }
      
      // Assigned to filter
      if (filters.assignedTo.length > 0) {
        if (!card.assignedTo || !filters.assignedTo.includes(card.assignedTo)) {
          return false;
        }
      }
      
      // Card number filter (partial match)
      if (filters.cardNumber && !card.cardNumber.toLowerCase().includes(filters.cardNumber.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [assemblyCards, filters]);

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const statusSet = new Set(assemblyCards.map(card => card.status));
    const typeSet = new Set(assemblyCards.map(card => card.type));
    const phaseSet = new Set(assemblyCards.map(card => card.phase.toString()));
    const assignedToSet = new Set(assemblyCards.map(card => card.assignedTo));
    
    const statuses = Array.from(statusSet).filter(Boolean);
    const types = Array.from(typeSet).filter(Boolean);
    const phases = Array.from(phaseSet).filter(Boolean);
    const assignedToIds = Array.from(assignedToSet).filter(Boolean);
    
    return {
      statuses,
      types,
      phases,
      assignedToIds
    };
  }, [assemblyCards]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: [],
      type: [],
      phase: [],
      assignedTo: [],
      cardNumber: "",
    });
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter !== ""
  );

  const handleCardEdit = (card: AssemblyCard) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleCardView = (card: AssemblyCard) => {
    setSelectedDetailCard(card);
    setIsDetailViewOpen(true);
  };

  // Bulk operations handlers
  const handleResetAllCardStatus = async () => {
    if (!window.confirm("Are you sure you want to reset all assembly cards to 'scheduled' status? This will clear all progress data.")) {
      return;
    }
    
    try {
      await resetAllStatusMutation.mutateAsync();
      toast({
        title: "Status Reset Complete",
        description: "All assembly cards have been reset to scheduled status.",
      });
    } catch (error) {
      console.error("Reset error:", error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset assembly card statuses. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllCards = async () => {
    if (!window.confirm("Are you sure you want to DELETE ALL assembly cards? This action cannot be undone and will permanently remove all cards from the database.")) {
      return;
    }
    
    // Double confirmation for destructive action
    if (!window.confirm("FINAL WARNING: This will permanently delete ALL assembly cards and their data. Type 'DELETE ALL' in your mind and click OK if you're absolutely certain.")) {
      return;
    }
    
    try {
      await deleteAllCardsMutation.mutateAsync();
      toast({
        title: "All Cards Deleted",
        description: "All assembly cards have been permanently deleted from the database.",
      });
    } catch (error) {
      console.error("Delete all error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete all assembly cards. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (cardsLoading || assemblersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gantt Chart View</h1>
          <p className="text-muted-foreground">
            Table view of all assembly cards with detailed information
          </p>
          <div className="text-sm text-muted-foreground mt-2">
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
              data-testid="input-start-date"
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
              data-testid="input-start-time"
            />
          </div>
          <Button onClick={() => setIsModalOpen(true)} data-testid="button-add-card">
            <Package className="h-4 w-4 mr-2" />
            Add Card
          </Button>
          <FileUpload />
          
          <Button
            onClick={handleResetAllCardStatus}
            variant="outline"
            size="sm"
            className="text-xs"
            data-testid="button-reset-all-status"
          >
            Reset All to Scheduled
          </Button>
          
          <Button
            onClick={handleDeleteAllCards}
            variant="destructive"
            size="sm"
            className="text-xs"
            data-testid="button-delete-all-cards"
          >
            Delete All Cards
          </Button>
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="secondary" 
                data-testid="button-filter"
                className={hasActiveFilters ? "bg-primary/10 border-primary" : ""}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {hasActiveFilters && (
                  <span className="ml-2 bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5">
                    {Object.values(filters).flat().filter(Boolean).length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filter Cards</h4>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                
                {/* Card Number Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Card Number</Label>
                  <Input
                    placeholder="Search by card number..."
                    value={filters.cardNumber}
                    onChange={(e) => setFilters(prev => ({ ...prev, cardNumber: e.target.value }))}
                    data-testid="filter-card-number"
                  />
                </div>
                
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="space-y-2">
                    {filterOptions.statuses.map(status => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.status.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, status: [...prev.status, status] }));
                            } else {
                              setFilters(prev => ({ ...prev, status: prev.status.filter(s => s !== status) }));
                            }
                          }}
                          data-testid={`filter-status-${status}`}
                        />
                        <Label htmlFor={`status-${status}`} className="text-sm capitalize">
                          {status.replace('_', ' ')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Type Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="space-y-2">
                    {filterOptions.types.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type}`}
                          checked={filters.type.includes(type)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, type: [...prev.type, type] }));
                            } else {
                              setFilters(prev => ({ ...prev, type: prev.type.filter(t => t !== type) }));
                            }
                          }}
                          data-testid={`filter-type-${type}`}
                        />
                        <Label htmlFor={`type-${type}`} className="text-sm">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Phase Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Phase</Label>
                  <div className="space-y-2">
                    {filterOptions.phases.map(phase => (
                      <div key={phase} className="flex items-center space-x-2">
                        <Checkbox
                          id={`phase-${phase}`}
                          checked={filters.phase.includes(phase)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilters(prev => ({ ...prev, phase: [...prev.phase, phase] }));
                            } else {
                              setFilters(prev => ({ ...prev, phase: prev.phase.filter(p => p !== phase) }));
                            }
                          }}
                          data-testid={`filter-phase-${phase}`}
                        />
                        <Label htmlFor={`phase-${phase}`} className="text-sm">
                          Phase {phase}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Assembler Filter */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Assigned To</Label>
                  <div className="space-y-2">
                    {filterOptions.assignedToIds.map(assemblerId => {
                      const assembler = assemblers.find(a => a.id === assemblerId);
                      return (
                        <div key={assemblerId} className="flex items-center space-x-2">
                          <Checkbox
                            id={`assembler-${assemblerId}`}
                            checked={filters.assignedTo.includes(assemblerId)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilters(prev => ({ ...prev, assignedTo: [...prev.assignedTo, assemblerId] }));
                              } else {
                                setFilters(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(a => a !== assemblerId) }));
                              }
                            }}
                            data-testid={`filter-assembler-${assemblerId}`}
                          />
                          <Label htmlFor={`assembler-${assemblerId}`} className="text-sm">
                            {assembler?.name || `Assembler ${assemblerId}`}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Showing {filteredAssemblyCards.length} of {assemblyCards.length} cards
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <DependencyLegend />

        <div className="bg-card rounded-lg border">
          <GanttTable
            assemblyCards={filteredAssemblyCards}
            assemblers={assemblers}
            onCardEdit={handleCardEdit}
            onCardView={handleCardView}
          />
        </div>
      </div>

      <AssemblyCardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCard(null);
        }}
        card={selectedCard}
        assemblers={assemblers}
      />

      <AssemblyDetailView
        card={selectedDetailCard}
        isOpen={isDetailViewOpen}
        onClose={() => {
          setIsDetailViewOpen(false);
          setSelectedDetailCard(null);
        }}
      />
    </div>
  );
}