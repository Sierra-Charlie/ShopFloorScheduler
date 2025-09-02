import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Shield, Zap, CheckCircle, Users } from "lucide-react";
import type { MessageThread } from "@shared/schema";

interface ThreadListProps {
  threads: MessageThread[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
}

const categoryIcons = {
  kaizen: Lightbulb,
  safety: Shield,
  efficiency: Zap,
  quality: CheckCircle,
  general: Users,
};

const categoryColors = {
  kaizen: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  safety: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  efficiency: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  quality: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const statusColors = {
  idea: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  evaluating: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  implementing: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

export function ThreadList({ threads, selectedThreadId, onThreadSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <Lightbulb className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          No improvement ideas yet. Be the first to share one!
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {threads.map((thread) => {
        const CategoryIcon = categoryIcons[thread.category as keyof typeof categoryIcons] || Users;
        
        return (
          <button
            key={thread.id}
            onClick={() => onThreadSelect(thread.id)}
            className={cn(
              "w-full p-4 text-left hover:bg-muted/50 transition-colors",
              selectedThreadId === thread.id && "bg-muted border-r-2 border-primary"
            )}
            data-testid={`thread-item-${thread.id}`}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-full shrink-0",
                categoryColors[thread.category as keyof typeof categoryColors] || categoryColors.general
              )}>
                <CategoryIcon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate text-sm">
                    {thread.title}
                  </h3>
                  {thread.upvotes > 0 && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      👍 {thread.upvotes}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs capitalize", statusColors[thread.implementationStatus as keyof typeof statusColors])}
                  >
                    {thread.implementationStatus}
                  </Badge>
                  {thread.tags.length > 0 && (
                    <div className="flex gap-1">
                      {thread.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {thread.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{thread.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}