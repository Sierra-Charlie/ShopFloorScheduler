import { useQuery } from "@tanstack/react-query";
import type { MessageThread } from "@shared/schema";

export function useMessageThreads() {
  return useQuery<MessageThread[]>({
    queryKey: ["/api/threads"],
    retry: false,
  });
}

export function useThread(threadId: string) {
  return useQuery<{ thread: MessageThread; messages: any[] }>({
    queryKey: ["/api/threads", threadId],
    enabled: !!threadId,
    retry: false,
  });
}