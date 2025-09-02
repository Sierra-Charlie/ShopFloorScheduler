import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AssemblyCard, Assembler, updateAssemblyCardSchema } from "@shared/schema";
import { useUpdateAssemblyCard } from "@/hooks/use-assembly-cards";
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

  const form = useForm({
    resolver: zodResolver(updateAssemblyCardSchema.omit({ id: true })),
    defaultValues: {
      cardNumber: "",
      name: "",
      type: "M" as "M" | "E" | "S" | "P" | "KB" | "DEAD_TIME",
      duration: 1,
      phase: 1,
      assignedTo: "",
      dependencies: [] as string[],
      precedents: [] as string[],
      grounded: false,
    },
  });

  useEffect(() => {
    if (card) {
      form.reset({
        cardNumber: card.cardNumber,
        name: card.name,
        type: card.type as "M" | "E" | "S" | "P" | "KB" | "DEAD_TIME",
        duration: card.duration,
        phase: card.phase,
        assignedTo: card.assignedTo || "",
        dependencies: card.dependencies || [],
        precedents: card.precedents || [],
        grounded: card.grounded || false,
      });
    }
  }, [card, form]);

  const onSubmit = async (data: any) => {
    if (!card) return;

    try {
      await updateCardMutation.mutateAsync({
        id: card.id,
        ...data,
      });
      toast({
        title: "Card updated successfully",
        description: `Assembly card ${data.cardNumber} has been updated`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Failed to update card",
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
            {card?.type === "DEAD_TIME" ? "Edit Dead Time" : "Edit Assembly Card"}
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
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                          </SelectContent>
                        </Select>
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
              name="precedents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precedents</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value.join(", ")}
                      onChange={(e) => field.onChange(
                        e.target.value.split(",").map(s => s.trim()).filter(Boolean)
                      )}
                      placeholder="Enter card numbers separated by commas"
                      data-testid="input-precedents"
                    />
                  </FormControl>
                  <FormDescription>
                    Cards that depend on this one being completed
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
                disabled={updateCardMutation.isPending}
                data-testid="button-save-modal"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
