import { useState } from "react";
import { useUsers } from "@/hooks/use-users";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface NewThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated: (threadId: string) => void;
}

const categories = [
  { value: "kaizen", label: "Kaizen (Continuous Improvement)", icon: "💡" },
  { value: "safety", label: "Safety Improvement", icon: "🛡️" },
  { value: "efficiency", label: "Efficiency Enhancement", icon: "⚡" },
  { value: "quality", label: "Quality Improvement", icon: "✅" },
  { value: "general", label: "General Discussion", icon: "💬" },
];

export function NewThreadDialog({ open, onOpenChange, onThreadCreated }: NewThreadDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { data: users = [] } = useUsers();

  const createThreadMutation = useMutation({
    mutationFn: async (data: { title: string; category: string; tags: string[]; initialMessage: string }) => {
      // Create the thread first
      const response = await apiRequest("POST", "/api/threads", {
        title: data.title,
        category: data.category,
        tags: data.tags,
        createdBy: "john-doe-id", // TODO: Get from current user context
      });
      const thread = await response.json();

      // Add selected participants to the thread
      if (data.selectedUsers.length > 0) {
        await apiRequest("POST", `/api/threads/${thread.id}/participants`, {
          userIds: data.selectedUsers
        });
      }

      // If there's an initial message, send it
      if (data.initialMessage.trim()) {
        await apiRequest("POST", `/api/threads/${thread.id}/messages`, {
          authorId: "john-doe-id", // TODO: Get from current user context
          content: data.initialMessage
        });
      }

      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      onThreadCreated(thread.id);
      resetForm();
    }
  });

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setInitialMessage("");
    setTags([]);
    setCurrentTag("");
    setSelectedUsers([]);
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = () => {
    if (title.trim() && category) {
      createThreadMutation.mutate({
        title: title.trim(),
        category,
        tags,
        selectedUsers,
        initialMessage: initialMessage.trim()
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share a New Idea</DialogTitle>
          <DialogDescription>
            Start a conversation about an improvement idea or suggestion with your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Idea Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief, descriptive title for your idea..."
              data-testid="input-thread-title"
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-thread-category">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tags">Tags (optional)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tags to help organize..."
                className="flex-1"
                data-testid="input-thread-tags"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!currentTag.trim()}
                data-testid="button-add-tag"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:bg-destructive/20 rounded-full"
                      data-testid={`remove-tag-${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="participants">Select Participants (optional)</Label>
            <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-md p-3">
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    data-testid={`checkbox-user-${user.id}`}
                  />
                  <label htmlFor={`user-${user.id}`} className="text-sm font-medium">
                    {user.name}
                  </label>
                  <Badge variant="outline" className="text-xs">
                    {user.role.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                </div>
              ))}
            </div>
            {selectedUsers.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">
                  {selectedUsers.length} participant{selectedUsers.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="initial-message">Initial Message (optional)</Label>
            <Textarea
              id="initial-message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Describe your idea in detail, include benefits, implementation thoughts..."
              rows={4}
              data-testid="textarea-initial-message"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-thread"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !category || createThreadMutation.isPending}
            data-testid="button-create-thread"
          >
            {createThreadMutation.isPending ? "Creating..." : "Start Conversation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}