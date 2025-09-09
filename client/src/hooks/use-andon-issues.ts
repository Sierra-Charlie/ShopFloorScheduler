import { useQuery } from "@tanstack/react-query";
import type { AndonIssue } from "@shared/schema";

export function useAndonIssues() {
  return useQuery<AndonIssue[]>({
    queryKey: ["/api/andon-issues"],
  });
}