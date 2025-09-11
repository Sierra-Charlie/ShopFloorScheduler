import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AssemblyCard, Assembler, updateAssemblyCardSchema, insertAssemblyCardSchema } from "@shared/schema";
import { useUpdateAssemblyCard, useCreateAssemblyCard } from "@/hooks/use-assembly-cards";
import { useToast } from "@/hooks/use-toast";

interface AssemblyCardModalProps {
  card: AssemblyCard | null;
  assemblers: Assembler[];
  isOpen: boolean;
  onClose: () => void;
}

export default function AssemblyCardModal({ card, assemblers, isOpen, onClose }: AssemblyCardModalProps) {
  const { toast } = useToast();
  const updateCardMutation = useUpdateAssemblyCard();
  const createCardMutation = useCreateAssemblyCard();
  
  const isEditing = Boolean(card);

  const form = useForm({
    resolver: zodResolver(isEditing ? updateAssemblyCardSchema.omit({ id: true }) : insertAssemblyCardSchema),
    defaultValues: {
      cardNumber: "",
      name: "",
      type: "M" as "M" | "E" | "S" | "P" | "KB" | "DEAD_TIME" | "D",
      duration: 1,
      phase: 1,
      assignedTo: "",
      dependencies: [] as string[],
      materialSeq: null,
      operationSeq: null,
      grounded: false,
      requiresCrane: false,
      priority: "B" as "A" | "B" | "C",
      pickTime: null as number | null,
    },
  });

  useEffect(() => {
    if (card) {
      form.reset({
        cardNumber: card.cardNumber,
        name: card.name,
        type: card.type as "M" | "E" | "S" | "P" | "KB" | "DEAD_TIME" | "D",
        duration: card.duration,
        phase: card.phase || undefined,
        assignedTo: card.assignedTo || "",
        dependencies: card.dependencies || [],
        materialSeq: card.materialSeq ?? undefined,
        operationSeq: card.operationSeq ?? undefined,
        grounded: card.grounded || false,
        requiresCrane: card.requiresCrane || false,
        priority: (card.priority as "A" | "B" | "C") || "B",
        pickTime: card.pickTime || null,
      });
    } else {
      // Reset to default values for new cards
      form.reset({
        cardNumber: "",
        name: "",
        type: "M" as "M" | "E" | "S" | "P" | "KB" | "DEAD_TIME" | "D",
        duration: 1,
        phase: 1,
        assignedTo: "",
        dependencies: [] as string[],
        materialSeq: null,
        operationSeq: null,
        grounded: false,
        requiresCrane: false,
        priority: "B" as "A" | "B" | "C",
        pickTime: null as number | null,
      });
    }
  }, [card, form]);

  const onSubmit = async (data: any) => {
    try {
      if (isEditing && card) {
        // Update existing card
        await updateCardMutation.mutateAsync({
          id: card.id,
          ...data,
        });
        toast({
          title: "Card updated successfully",
          description: `Assembly card ${data.cardNumber} has been updated`,
        });
      } else {
        // Create new card
        await createCardMutation.mutateAsync(data);
        toast({
          title: "Card created successfully",
          description: `Assembly card ${data.cardNumber} has been created`,
        });
      }
      onClose();
    } catch (error) {
      toast({
        title: isEditing ? "Failed to update card" : "Failed to create card",
        description: "Please check your inputs and try again",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="modal-assembly-card">
        <DialogHeader>
          <DialogTitle data-testid="modal-title">
            {isEditing 
              ? (card?.type === "DEAD_TIME" ? "Edit Dead Time" : "Edit Assembly Card")
              : "Create Assembly Card"
            }
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {card?.type === "DEAD_TIME" ? (
              // Dead Time specific fields
              <>
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select
                        value={field.value.toString()}
                        onValueChange={(value) => field.onChange(parseFloat(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-dead-time-duration">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0.25">15 minutes</SelectItem>
                          <SelectItem value="0.5">30 minutes</SelectItem>
                          <SelectItem value="0.75">45 minutes</SelectItem>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="1.25">1 hour 15 minutes</SelectItem>
                          <SelectItem value="1.5">1 hour 30 minutes</SelectItem>
                          <SelectItem value="1.75">1 hour 45 minutes</SelectItem>
                          <SelectItem value="2">2 hours</SelectItem>
                          <SelectItem value="2.5">2 hours 30 minutes</SelectItem>
                          <SelectItem value="3">3 hours</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="6">6 hours</SelectItem>
                          <SelectItem value="8">8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              // Regular assembly card fields
              <>
                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Card Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-card-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assembly Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-assembly-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="D">D - Direct to Machine</SelectItem>
                          <SelectItem value="E">E - Electrical</SelectItem>
                          <SelectItem value="KB">KB - Kanban</SelectItem>
                          <SelectItem value="M">M - Mechanical</SelectItem>
                          <SelectItem value="P">P - Pre-Assembly</SelectItem>
                          <SelectItem value="S">S - Sub Assembly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (hrs)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            min="0.5"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phase</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-phase">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Phase 1</SelectItem>
                            <SelectItem value="2">Phase 2</SelectItem>
                            <SelectItem value="3">Phase 3</SelectItem>
                            <SelectItem value="4">Phase 4</SelectItem>
                            <SelectItem value="5">Phase 5</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pickTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pick Time</FormLabel>
                        <Select
                          value={field.value ? field.value.toString() : "0"}
                          onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-pick-time">
                              <SelectValue placeholder="Select pick time" />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="materialSeq"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Seq</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Material sequence info"
                            data-testid="input-material-seq"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="operationSeq"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operation Seq</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder="Operation sequence info"
                            data-testid="input-operation-seq"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            
            {/* Dependencies and other fields - only for regular cards */}
            {card?.type !== "DEAD_TIME" && (
              <>
                <FormField
                  control={form.control}
                  name="dependencies"
                  render={({ field }) => (
                <FormItem>
                  <FormLabel>Dependencies</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value.join(", ")}
                      onChange={(e) => field.onChange(
                        e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                      )}
                      placeholder="Enter card numbers separated by commas"
                      data-testid="input-dependencies"
                    />
                  </FormControl>
                  <FormDescription>
                    Cards that must be completed before this one starts
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-assigned-to">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assemblers.map(assembler => (
                        <SelectItem key={assembler.id} value={assembler.id}>
                          {assembler.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Grounded checkbox - only for regular cards */}
            <FormField
              control={form.control}
              name="grounded"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-grounded"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Ground Assembly Card (Lock in Place)
                    </FormLabel>
                    <FormDescription>
                      When grounded, this card cannot be moved. Useful for material delivery scheduling.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            {/* Crane requirement checkbox - only for regular cards */}
            <FormField
              control={form.control}
              name="requiresCrane"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-requires-crane"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Requires Crane
                    </FormLabel>
                    <FormDescription>
                      Check if this assembly requires crane assistance.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
              </>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-modal"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateCardMutation.isPending || createCardMutation.isPending}
                data-testid="button-save-modal"
              >
                {isEditing ? 'Save Changes' : 'Create Card'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
