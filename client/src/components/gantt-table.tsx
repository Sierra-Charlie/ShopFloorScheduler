import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Edit, Trash2, AlertTriangle } from "lucide-react";
import { AssemblyCard, Assembler } from "@shared/schema";
import { useUpdateAssemblyCard, useDeleteAssemblyCard } from "@/hooks/use-assembly-cards";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GanttTableProps {
  assemblyCards: AssemblyCard[];
  assemblers: Assembler[];
  onCardEdit: (card: AssemblyCard) => void;
  onCardView?: (card: AssemblyCard) => void;
}

const getPhaseColor = (phase: number) => {
  switch (phase) {
    case 1: return "phase-1";
    case 2: return "phase-2";
    case 3: return "phase-3";
    case 4: return "phase-4";
    case 5: return "phase-5";
    default: return "phase-1";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "in_progress": return { variant: "default" as const, label: "In Progress" };
    case "completed": return { variant: "default" as const, label: "Completed" };
    case "blocked": return { variant: "destructive" as const, label: "Blocked" };
    case "scheduled": return { variant: "secondary" as const, label: "Scheduled" };
    default: return { variant: "secondary" as const, label: status };
  }
};

const generatePickListUrl = (jobNumber: string | null, assemblySeq: string | null, operationSeq: string | null): string | null => {
  // Return null if any required field is missing
  if (!jobNumber || !assemblySeq || !operationSeq) {
    return null;
  }
  
  const baseUrl = "https://centralusdtapp47.epicorsaas.com/SaaS5073/Apps/Erp/Home/#/view/UDJobPik?channelid=efccd09a-297a-4e13-a529-94c7486c2d20&layerVersion=0&baseAppVersion=0&company=VIK&site=MfgSys&";
  return `${baseUrl}KeyFields.JobNum=${encodeURIComponent(jobNumber)}&KeyFields.AsySeq=${encodeURIComponent(assemblySeq)}&KeyFields.OpSeq=${encodeURIComponent(operationSeq)}`;
};


export default function GanttTable({ assemblyCards, assemblers, onCardEdit, onCardView }: GanttTableProps) {
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AssemblyCard>>({});
  
  // Filter states
  const [filters, setFilters] = useState({
    cardNumber: '',
    name: '',
    type: '',
    duration: '',
    dependencies: '',
    phase: '',
    priority: '',
    materialSeq: '',
    assemblySeq: '',
    operationSeq: '',
    pickTime: '',
    assignedTo: '',
    machineType: '',
    machineNumber: '',
    status: '',
    subAssyArea: '',
    crane: '',
  });
  
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const deleteCardMutation = useDeleteAssemblyCard();

  const handleEdit = (card: AssemblyCard) => {
    setEditingCard(card.id);
    setEditValues(card);
  };

  const handleSave = async (cardId: string) => {
    try {
      // Clean the data before sending
      const updateData: any = {
        id: cardId,
      };
      
      if (editValues.cardNumber !== undefined) updateData.cardNumber = editValues.cardNumber;
      if (editValues.name !== undefined) updateData.name = editValues.name;
      if (editValues.type !== undefined) updateData.type = editValues.type;
      if (editValues.duration !== undefined) updateData.duration = editValues.duration;
      if (editValues.phase !== undefined) updateData.phase = editValues.phase;
      if (editValues.assignedTo !== undefined) updateData.assignedTo = editValues.assignedTo;
      if (editValues.status !== undefined) updateData.status = editValues.status;
      if (editValues.dependencies !== undefined) updateData.dependencies = editValues.dependencies;
      if (editValues.materialSeq !== undefined) updateData.materialSeq = editValues.materialSeq;
      if (editValues.assemblySeq !== undefined) updateData.assemblySeq = editValues.assemblySeq;
      if (editValues.operationSeq !== undefined) updateData.operationSeq = editValues.operationSeq;
      if (editValues.pickTime !== undefined) updateData.pickTime = editValues.pickTime;
      if (editValues.gembaDocLink !== undefined) updateData.gembaDocLink = editValues.gembaDocLink;
      if (editValues.pickListLink !== undefined) updateData.pickListLink = editValues.pickListLink;
      if (editValues.requiresCrane !== undefined) updateData.requiresCrane = editValues.requiresCrane;
      if (editValues.priority !== undefined) updateData.priority = editValues.priority;
      // Always include subAssyArea if it exists in editValues
      updateData.subAssyArea = editValues.subAssyArea;
      
      await updateCardMutation.mutateAsync(updateData);
      setEditingCard(null);
      setEditValues({});
      toast({
        title: "Card updated successfully",
        description: "Assembly card has been updated",
      });
    } catch (error) {
      console.error("Update error:", error);
      toast({
        title: "Failed to update card",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingCard(null);
    setEditValues({});
  };

  const handleDelete = async (cardId: string, cardNumber: string) => {
    if (confirm(`Are you sure you want to delete card ${cardNumber}?`)) {
      try {
        await deleteCardMutation.mutateAsync(cardId);
        toast({
          title: "Card deleted successfully",
          description: `Card ${cardNumber} has been deleted`,
        });
      } catch (error) {
        toast({
          title: "Failed to delete card",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  // Helper function for safe string filtering
  const safeStringIncludes = (value: any, filter: string): boolean => {
    if (filter === '') return true;
    const safeValue = String(value ?? '').toLowerCase();
    const safeFilter = filter.toLowerCase();
    return safeValue.includes(safeFilter);
  };

  // Helper function for safe dependency filtering
  const safeDependencyIncludes = (dependencies: string[] | undefined, filter: string): boolean => {
    if (filter === '') return true;
    if (!dependencies || dependencies.length === 0) return false;
    const safeFilter = filter.toLowerCase();
    return dependencies.some(dep => String(dep ?? '').toLowerCase().includes(safeFilter));
  };

  // Filter assembly cards based on filter values
  const filteredCards = assemblyCards.filter(card => {
    const assignedAssembler = assemblers.find(a => a.id === card.assignedTo);
    
    return (
      safeStringIncludes(card.cardNumber, filters.cardNumber) &&
      safeStringIncludes(card.name, filters.name) &&
      (filters.type === '' || card.type === filters.type) &&
      safeStringIncludes(card.duration, filters.duration) &&
      safeDependencyIncludes(card.dependencies, filters.dependencies) &&
      (filters.phase === '' || String(card.phase ?? '') === filters.phase) &&
      (filters.priority === '' || card.priority === filters.priority) &&
      safeStringIncludes(card.materialSeq, filters.materialSeq) &&
      safeStringIncludes(card.assemblySeq, filters.assemblySeq) &&
      safeStringIncludes(card.operationSeq, filters.operationSeq) &&
      safeStringIncludes(card.pickTime, filters.pickTime) &&
      safeStringIncludes(assignedAssembler?.name, filters.assignedTo) &&
      safeStringIncludes(assignedAssembler?.machineType, filters.machineType) &&
      safeStringIncludes(assignedAssembler?.machineNumber, filters.machineNumber) &&
      (filters.status === '' || card.status === filters.status) &&
      safeStringIncludes(card.subAssyArea, filters.subAssyArea) &&
      (filters.crane === '' || (filters.crane === 'yes' ? card.requiresCrane : !card.requiresCrane))
    );
  });

  // Check for dependency issues
  const hasDependencyIssues = (card: AssemblyCard) => {
    return card.dependencies?.some(dep => {
      const depCard = assemblyCards.find(c => c.cardNumber === dep);
      if (!depCard) return true; // Card not found
      
      // Check position-based conflicts within the same assembler
      if (depCard.assignedTo === card.assignedTo) {
        // Dependency card is in the same swim lane - check position order
        return (depCard.position || 0) >= (card.position || 0);
      }
      
      // Check timing conflicts for cards in different assemblers
      if (card.startTime && depCard.endTime) {
        return new Date(depCard.endTime) > new Date(card.startTime);
      }
      
      // If no timing info, check status
      return depCard.status === "blocked";
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted z-20 border-r border-border">
                Card #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Duration
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Dependencies
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phase
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Job Number</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assembly Seq
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Operation Seq
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Pick List Link</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pick Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Machine Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Machine Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sub Assy Area
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Crane
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Gemba Doc Link
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
            {/* Filter Row */}
            <tr className="bg-muted">
              <th className="px-2 py-2 sticky left-0 bg-muted z-20 border-r border-border">
                <Input
                  placeholder="Filter..."
                  value={filters.cardNumber}
                  onChange={(e) => setFilters(prev => ({ ...prev, cardNumber: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-card-number"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Filter..."
                  value={filters.name}
                  onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-name"
                />
              </th>
              <th className="px-2 py-2">
                <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger className="h-8 text-xs" data-testid="filter-type">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="E">E</SelectItem>
                    <SelectItem value="KB">KB</SelectItem>
                    <SelectItem value="M">M</SelectItem>
                    <SelectItem value="P">P</SelectItem>
                    <SelectItem value="S">S</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Hours..."
                  value={filters.duration}
                  onChange={(e) => setFilters(prev => ({ ...prev, duration: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-duration"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Dependencies..."
                  value={filters.dependencies}
                  onChange={(e) => setFilters(prev => ({ ...prev, dependencies: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-dependencies"
                />
              </th>
              <th className="px-2 py-2">
                <Select value={filters.phase} onValueChange={(value) => setFilters(prev => ({ ...prev, phase: value }))}>
                  <SelectTrigger className="h-8 text-xs" data-testid="filter-phase">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Phases</SelectItem>
                    <SelectItem value="1">Phase 1</SelectItem>
                    <SelectItem value="2">Phase 2</SelectItem>
                    <SelectItem value="3">Phase 3</SelectItem>
                    <SelectItem value="4">Phase 4</SelectItem>
                    <SelectItem value="5">Phase 5</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="px-2 py-2">
                <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="h-8 text-xs" data-testid="filter-priority">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priorities</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Job #..."
                  value={filters.materialSeq}
                  onChange={(e) => setFilters(prev => ({ ...prev, materialSeq: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-material-seq"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Assy #..."
                  value={filters.assemblySeq}
                  onChange={(e) => setFilters(prev => ({ ...prev, assemblySeq: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-assembly-seq"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Op #..."
                  value={filters.operationSeq}
                  onChange={(e) => setFilters(prev => ({ ...prev, operationSeq: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-operation-seq"
                />
              </th>
              <th className="px-2 py-2">
                <div className="h-8"></div>
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Minutes..."
                  value={filters.pickTime}
                  onChange={(e) => setFilters(prev => ({ ...prev, pickTime: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-pick-time"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Assigned..."
                  value={filters.assignedTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-assigned-to"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Machine..."
                  value={filters.machineType}
                  onChange={(e) => setFilters(prev => ({ ...prev, machineType: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-machine-type"
                />
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Number..."
                  value={filters.machineNumber}
                  onChange={(e) => setFilters(prev => ({ ...prev, machineNumber: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-machine-number"
                />
              </th>
              <th className="px-2 py-2">
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className="h-8 text-xs" data-testid="filter-status">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="px-2 py-2">
                <Input
                  placeholder="Area..."
                  value={filters.subAssyArea}
                  onChange={(e) => setFilters(prev => ({ ...prev, subAssyArea: e.target.value }))}
                  className="h-8 text-xs"
                  data-testid="filter-sub-assy-area"
                />
              </th>
              <th className="px-2 py-2">
                <Select value={filters.crane} onValueChange={(value) => setFilters(prev => ({ ...prev, crane: value }))}>
                  <SelectTrigger className="h-8 text-xs" data-testid="filter-crane">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </th>
              <th className="px-2 py-2">
                <div className="h-8"></div>
              </th>
              <th className="px-2 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({
                    cardNumber: '', name: '', type: '', duration: '', dependencies: '', phase: '',
                    priority: '', materialSeq: '', assemblySeq: '', operationSeq: '', pickTime: '',
                    assignedTo: '', machineType: '', machineNumber: '', status: '', subAssyArea: '', crane: ''
                  })}
                  className="h-8 px-2 text-xs"
                  data-testid="clear-filters"
                >
                  Clear
                </Button>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredCards.map((card) => {
              const isEditing = editingCard === card.id;
              const hasIssues = hasDependencyIssues(card);
              const statusBadge = getStatusBadge(card.status);
              const assignedAssembler = assemblers.find(a => a.id === card.assignedTo);

              return (
                <tr
                  key={card.id}
                  className={cn(
                    "hover:bg-accent/30 transition-colors cursor-pointer",
                    hasIssues && "bg-accent/10"
                  )}
                  onClick={() => !isEditing && onCardView?.(card)}
                  data-testid={`gantt-row-${card.cardNumber}`}
                >
                  <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-card z-10 border-r border-border">
                    <div className="flex items-center">
                      <div className={cn("w-3 h-3 rounded mr-2", getPhaseColor(card.phase || 1))}></div>
                      {isEditing ? (
                        <Input
                          value={editValues.cardNumber || card.cardNumber}
                          onChange={(e) => setEditValues(prev => ({ ...prev, cardNumber: e.target.value }))}
                          className="w-20 text-sm font-medium"
                          data-testid={`input-card-number-${card.cardNumber}`}
                        />
                      ) : (
                        <span className="text-sm font-medium">{card.cardNumber}</span>
                      )}
                      {hasIssues && (
                        <AlertTriangle className="ml-2 h-4 w-4 text-warning" />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        value={editValues.name || card.name}
                        onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full"
                        data-testid={`input-name-${card.cardNumber}`}
                      />
                    ) : (
                      <span className="text-sm" data-testid={`text-name-${card.cardNumber}`}>
                        {card.name}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={editValues.type || card.type}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-type-${card.cardNumber}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="D">D</SelectItem>
                          <SelectItem value="E">E</SelectItem>
                          <SelectItem value="KB">KB</SelectItem>
                          <SelectItem value="M">M</SelectItem>
                          <SelectItem value="P">P</SelectItem>
                          <SelectItem value="S">S</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-type-${card.cardNumber}`}>
                        {card.type}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <div className="flex items-center space-x-1">
                        <Input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={editValues.duration || card.duration}
                          onChange={(e) => setEditValues(prev => ({ ...prev, duration: parseFloat(e.target.value) || 0 }))}
                          className="w-20"
                          data-testid={`input-duration-${card.cardNumber}`}
                        />
                        <span className="text-xs text-muted-foreground">hrs</span>
                      </div>
                    ) : (
                      <span className="text-sm" data-testid={`text-duration-${card.cardNumber}`}>
                        {card.duration} hrs
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={""}
                        onValueChange={(value) => {
                          const currentDeps = editValues.dependencies || card.dependencies || [];
                          if (!currentDeps.includes(value)) {
                            setEditValues(prev => ({ 
                              ...prev, 
                              dependencies: [...currentDeps, value]
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className={cn("w-32", hasIssues && "border-warning")} data-testid={`select-dependencies-${card.cardNumber}`}>
                          <SelectValue placeholder="Add dependency" />
                        </SelectTrigger>
                        <SelectContent>
                          {assemblyCards
                            .filter(c => c.cardNumber !== card.cardNumber)
                            .map(c => (
                              <SelectItem key={c.id} value={c.cardNumber}>
                                {c.cardNumber} - {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={cn("text-sm", hasIssues && "text-warning")} data-testid={`text-dependencies-${card.cardNumber}`}>
                        {card.dependencies?.join(", ") || "None"}
                      </span>
                    )}
                    {isEditing && (editValues.dependencies || card.dependencies || []).length > 0 && (
                      <div className="mt-1">
                        {(editValues.dependencies || card.dependencies || []).map(dep => (
                          <span 
                            key={dep} 
                            className="inline-block text-xs bg-accent text-accent-foreground px-2 py-1 rounded mr-1 mb-1 cursor-pointer"
                            onClick={() => {
                              const currentDeps = editValues.dependencies || card.dependencies || [];
                              setEditValues(prev => ({ 
                                ...prev, 
                                dependencies: currentDeps.filter(d => d !== dep)
                              }));
                            }}
                          >
                            {dep} ×
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={editValues.phase?.toString() || card.phase?.toString() || "1"}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, phase: parseInt(value) }))}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-phase-${card.cardNumber}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Phase 1</SelectItem>
                          <SelectItem value="2">Phase 2</SelectItem>
                          <SelectItem value="3">Phase 3</SelectItem>
                          <SelectItem value="4">Phase 4</SelectItem>
                          <SelectItem value="5">Phase 5</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-phase-${card.cardNumber}`}>
                        {card.phase ? `Phase ${card.phase}` : "No Phase"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={editValues.priority || card.priority || "B"}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-priority-${card.cardNumber}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-priority-${card.cardNumber}`}>
                        {card.priority || "B"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.materialSeq || card.materialSeq || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, materialSeq: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Material seq"
                        className="w-32"
                        data-testid={`input-material-seq-${card.cardNumber}`}
                      />
                    ) : (
                      <span className="text-sm" data-testid={`text-material-seq-${card.cardNumber}`}>
                        {card.materialSeq !== null && card.materialSeq !== undefined ? card.materialSeq : "Not specified"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.assemblySeq || card.assemblySeq || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, assemblySeq: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Assembly seq"
                        className="w-32"
                        data-testid={`input-assembly-seq-${card.cardNumber}`}
                      />
                    ) : (
                      <span className="text-sm" data-testid={`text-assembly-seq-${card.cardNumber}`}>
                        {card.assemblySeq !== null && card.assemblySeq !== undefined ? card.assemblySeq : "Not specified"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.operationSeq || card.operationSeq || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, operationSeq: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="Operation seq"
                        className="w-32"
                        data-testid={`input-operation-seq-${card.cardNumber}`}
                      />
                    ) : (
                      <span className="text-sm" data-testid={`text-operation-seq-${card.cardNumber}`}>
                        {card.operationSeq !== null && card.operationSeq !== undefined ? card.operationSeq : "Not specified"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        type="url"
                        value={editValues.pickListLink || card.pickListLink || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, pickListLink: e.target.value || null }))}
                        placeholder="https://..."
                        className="w-40"
                        data-testid={`input-pick-list-link-${card.cardNumber}`}
                      />
                    ) : (
                      <span className="text-sm" data-testid={`text-pick-list-link-${card.cardNumber}`}>
                        {(() => {
                          // Use manual link if available, otherwise auto-generate
                          const manualLink = card.pickListLink;
                          const autoLink = generatePickListUrl(card.materialSeq?.toString() || null, card.assemblySeq?.toString() || null, card.operationSeq?.toString() || null);
                          const linkToUse = manualLink || autoLink;
                          
                          if (linkToUse) {
                            return (
                              <a 
                                href={linkToUse} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Pick List Link
                              </a>
                            );
                          } else {
                            return "Not specified";
                          }
                        })()}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={editValues.pickTime ? editValues.pickTime.toString() : card.pickTime ? card.pickTime.toString() : "0"}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, pickTime: value === "0" ? null : parseInt(value) }))}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-pick-time-${card.cardNumber}`}>
                          <SelectValue placeholder="Pick time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No pick time</SelectItem>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                          <SelectItem value="75">75 minutes</SelectItem>
                          <SelectItem value="90">90 minutes</SelectItem>
                          <SelectItem value="105">105 minutes</SelectItem>
                          <SelectItem value="120">120 minutes</SelectItem>
                          <SelectItem value="135">135 minutes</SelectItem>
                          <SelectItem value="150">150 minutes</SelectItem>
                          <SelectItem value="165">165 minutes</SelectItem>
                          <SelectItem value="180">180 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-pick-time-${card.cardNumber}`}>
                        {card.pickTime ? `${card.pickTime} min` : "Not specified"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={editValues.assignedTo || card.assignedTo || ""}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, assignedTo: value }))}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-assigned-${card.cardNumber}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assemblers.map(assembler => (
                            <SelectItem key={assembler.id} value={assembler.id}>
                              {assembler.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-assigned-${card.cardNumber}`}>
                        {assignedAssembler?.name || "Unassigned"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm" data-testid={`text-machine-type-${card.cardNumber}`}>
                      {assignedAssembler?.machineType || "-"}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm" data-testid={`text-machine-number-${card.cardNumber}`}>
                      {assignedAssembler?.machineNumber || "-"}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant={statusBadge.variant} data-testid={`badge-status-${card.cardNumber}`}>
                      {statusBadge.label}
                    </Badge>
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing && (card.type === "S" || card.type === "P") ? (
                      <Select
                        value={editValues.subAssyArea?.toString() || card.subAssyArea?.toString() || ""}
                        onValueChange={(value) => setEditValues(prev => ({ ...prev, subAssyArea: value ? parseInt(value) : null }))}
                      >
                        <SelectTrigger className="w-full" data-testid={`select-sub-assy-${card.cardNumber}`}>
                          <SelectValue placeholder="Select Area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Area 1</SelectItem>
                          <SelectItem value="2">Area 2</SelectItem>
                          <SelectItem value="3">Area 3</SelectItem>
                          <SelectItem value="4">Area 4</SelectItem>
                          <SelectItem value="5">Area 5</SelectItem>
                          <SelectItem value="6">Area 6</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-sub-assy-${card.cardNumber}`}>
                        {(card.type === "S" || card.type === "P") && card.subAssyArea ? `Area ${card.subAssyArea}` : "-"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Button
                        variant={editValues.requiresCrane !== undefined ? (editValues.requiresCrane ? "default" : "outline") : (card.requiresCrane ? "default" : "outline")}
                        size="sm"
                        onClick={() => {
                          const currentValue = editValues.requiresCrane !== undefined ? editValues.requiresCrane : card.requiresCrane;
                          setEditValues(prev => ({ ...prev, requiresCrane: !currentValue }));
                        }}
                        className="w-16"
                        data-testid={`toggle-crane-${card.cardNumber}`}
                      >
                        {editValues.requiresCrane !== undefined ? (editValues.requiresCrane ? "Yes" : "No") : (card.requiresCrane ? "Yes" : "No")}
                      </Button>
                    ) : (
                      <span className="text-sm" data-testid={`text-crane-${card.cardNumber}`}>
                        {card.requiresCrane ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Input
                        type="url"
                        value={editValues.gembaDocLink || card.gembaDocLink || ""}
                        onChange={(e) => setEditValues(prev => ({ ...prev, gembaDocLink: e.target.value || null }))}
                        placeholder="https://..."  
                        className="w-40"
                        data-testid={`input-gemba-link-${card.cardNumber}`}
                      />
                    ) : (
                      <span className="text-sm" data-testid={`text-gemba-link-${card.cardNumber}`}>
                        {card.gembaDocLink ? (
                          <a 
                            href={card.gembaDocLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View Doc
                          </a>
                        ) : (
                          "None"
                        )}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(card.id)}
                          disabled={updateCardMutation.isPending}
                          data-testid={`button-save-${card.cardNumber}`}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          data-testid={`button-cancel-${card.cardNumber}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(card);
                          }}
                          data-testid={`button-edit-${card.cardNumber}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(card.id, card.cardNumber);
                          }}
                          className="text-warning hover:text-warning/80"
                          data-testid={`button-delete-${card.cardNumber}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
