import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useThread } from "@/hooks/use-message-threads";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Send, Menu, ArrowUp, ArrowDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@shared/schema";

interface ChatViewProps {
  threadId: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const statusColors = {
  idea: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  evaluating: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  implementing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function ChatView({ threadId, sidebarCollapsed, onToggleSidebar }: ChatViewProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useThread(threadId);
  const { isConnected } = useWebSocket();

  const thread = data?.thread;
  const messages = data?.messages || [];

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/threads/${threadId}/messages`, {
        authorId: "john-doe-id", // TODO: Get from current user context
        content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
      setMessage("");
    }
  });

  const voteOnThreadMutation = useMutation({
    mutationFn: async (voteType: "upvote" | "downvote") => {
      const response = await apiRequest("POST", `/api/threads/${threadId}/vote`, {
        userId: "john-doe-id", // TODO: Get from current user context
        voteType
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/threads", threadId] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
    }
  });

  const handleSendMessage = () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Thread not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Thread Header */}
      <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSidebar}
              data-testid="button-show-sidebar"
            >
              <Menu className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-lg font-semibold">{thread.title}</h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => voteOnThreadMutation.mutate("upvote")}
                  className="h-8 px-2 gap-1"
                  data-testid="button-upvote"
                >
                  <ArrowUp className="h-3 w-3" />
                  {thread.upvotes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => voteOnThreadMutation.mutate("downvote")}
                  className="h-8 px-2"
                  data-testid="button-downvote"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-xs capitalize", statusColors[thread.implementationStatus as keyof typeof statusColors])}
              >
                {thread.implementationStatus}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {thread.category}
              </Badge>
              {thread.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Online: {isConnected ? "Connected" : "Offline"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No messages yet. Be the first to share your thoughts!
              </p>
            </div>
          ) : (
            messages.map((msg: Message) => (
              <div key={msg.id} className="flex gap-3 group" data-testid={`message-${msg.id}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10">
                    {msg.authorId?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {msg.authorId} {/* TODO: Replace with actual user name */}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.attachmentPath && (
                      <div className="mt-2 p-2 bg-background rounded border">
                        <p className="text-xs text-muted-foreground">📎 Attachment</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Share your ideas and feedback..."
            className="flex-1"
            data-testid="input-message"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}