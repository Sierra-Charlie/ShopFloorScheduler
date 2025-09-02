import { useState, useEffect } from "react";
import MainHeader from "@/components/main-header";
import { ThreadList } from "@/components/messaging/thread-list";
import { ChatView } from "@/components/messaging/chat-view";
import { NewThreadDialog } from "@/components/messaging/new-thread-dialog";
import { useMessageThreads } from "@/hooks/use-message-threads";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showNewThreadDialog, setShowNewThreadDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: threads = [], isLoading } = useMessageThreads();

  // Auto-select first thread if none selected
  useEffect(() => {
    if (threads.length > 0 && !selectedThreadId) {
      setSelectedThreadId(threads[0].id);
    }
  }, [threads, selectedThreadId]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <MainHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Thread Sidebar */}
        <div className={cn(
          "bg-muted/30 border-r transition-all duration-300",
          sidebarCollapsed ? "w-0 min-w-0" : "w-80 min-w-80"
        )}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Kaizen Ideas</h2>
                <Button
                  onClick={() => setShowNewThreadDialog(true)}
                  size="sm"
                  data-testid="button-new-thread"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Idea
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Share improvement ideas and collaborate with the team
              </p>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="p-4">
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                </div>
              ) : (
                <ThreadList
                  threads={threads}
                  selectedThreadId={selectedThreadId}
                  onThreadSelect={setSelectedThreadId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedThreadId ? (
            <ChatView
              threadId={selectedThreadId}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start sharing your improvement ideas with the team
                </p>
                <Button
                  onClick={() => setShowNewThreadDialog(true)}
                  data-testid="button-start-conversation"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <NewThreadDialog
        open={showNewThreadDialog}
        onOpenChange={setShowNewThreadDialog}
        onThreadCreated={(threadId) => {
          setSelectedThreadId(threadId);
          setShowNewThreadDialog(false);
        }}
      />
    </div>
  );
}