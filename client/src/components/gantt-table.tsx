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
}

const getPhaseColor = (phase: number) => {
  switch (phase) {
    case 1: return "phase-1";
    case 2: return "phase-2";
    case 3: return "phase-3";
    case 4: return "phase-4";
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

export default function GanttTable({ assemblyCards, assemblers, onCardEdit }: GanttTableProps) {
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AssemblyCard>>({});
  
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const deleteCardMutation = useDeleteAssemblyCard();

  const handleEdit = (card: AssemblyCard) => {
    setEditingCard(card.id);
    setEditValues(card);
  };

  const handleSave = async (cardId: string) => {
    try {
      console.log("Attempting to save card:", cardId, "with data:", editValues);
      
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
      if (editValues.precedents !== undefined) updateData.precedents = editValues.precedents;
      
      console.log("Cleaned update data:", updateData);
      
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

  // Check for dependency issues
  const hasDependencyIssues = (card: AssemblyCard) => {
    return card.dependencies?.some(dep => {
      const depCard = assemblyCards.find(c => c.cardNumber === dep);
      if (!depCard) return true; // Card not found
      
      // Check if dependency will finish before this card starts
      if (card.startTime && depCard.endTime) {
        return new Date(depCard.endTime) > new Date(card.startTime);
      }
      
      // If no timing info, check status
      return depCard.status === "blocked";
    });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" data-testid="gantt-title">
            Assembly Card Details Editor
          </h2>
          <div className="flex items-center space-x-3">
            <Button size="sm" data-testid="button-add-card">
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
            <Button variant="secondary" size="sm" data-testid="button-filter">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                Precedents
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Phase
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {assemblyCards.map((card) => {
              const isEditing = editingCard === card.id;
              const hasIssues = hasDependencyIssues(card);
              const statusBadge = getStatusBadge(card.status);
              const assignedAssembler = assemblers.find(a => a.id === card.assignedTo);

              return (
                <tr
                  key={card.id}
                  className={cn(
                    "hover:bg-accent/30 transition-colors",
                    hasIssues && "bg-accent/10"
                  )}
                  data-testid={`gantt-row-${card.cardNumber}`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={cn("w-3 h-3 rounded mr-2", getPhaseColor(card.phase))}></div>
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
                          <SelectItem value="M">Mechanical Install</SelectItem>
                          <SelectItem value="E">Electrical Install</SelectItem>
                          <SelectItem value="S">Sub-Assembly</SelectItem>
                          <SelectItem value="P">Pre-Assembly</SelectItem>
                          <SelectItem value="KB">Kanban</SelectItem>
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
                          value={editValues.duration || card.duration}
                          onChange={(e) => setEditValues(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
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
                        value={""}
                        onValueChange={(value) => {
                          const currentPrec = editValues.precedents || card.precedents || [];
                          if (!currentPrec.includes(value)) {
                            setEditValues(prev => ({ 
                              ...prev, 
                              precedents: [...currentPrec, value]
                            }));
                          }
                        }}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-precedents-${card.cardNumber}`}>
                          <SelectValue placeholder="Add precedent" />
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
                      <span className="text-sm" data-testid={`text-precedents-${card.cardNumber}`}>
                        {card.precedents?.join(", ") || "None"}
                      </span>
                    )}
                    {isEditing && (editValues.precedents || card.precedents || []).length > 0 && (
                      <div className="mt-1">
                        {(editValues.precedents || card.precedents || []).map(prec => (
                          <span 
                            key={prec} 
                            className="inline-block text-xs bg-accent text-accent-foreground px-2 py-1 rounded mr-1 mb-1 cursor-pointer"
                            onClick={() => {
                              const currentPrec = editValues.precedents || card.precedents || [];
                              setEditValues(prev => ({ 
                                ...prev, 
                                precedents: currentPrec.filter(p => p !== prec)
                              }));
                            }}
                          >
                            {prec} ×
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <Select
                        value={editValues.phase?.toString() || card.phase.toString()}
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
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm" data-testid={`text-phase-${card.cardNumber}`}>
                        Phase {card.phase}
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
                    <Badge variant={statusBadge.variant} data-testid={`badge-status-${card.cardNumber}`}>
                      {statusBadge.label}
                    </Badge>
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
                          onClick={() => handleEdit(card)}
                          data-testid={`button-edit-${card.cardNumber}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(card.id, card.cardNumber)}
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
