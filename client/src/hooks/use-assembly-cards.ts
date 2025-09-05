import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AssemblyCard, UpdateAssemblyCard, InsertAssemblyCard } from "@shared/schema";

export function useAssemblyCards() {
  return useQuery<AssemblyCard[]>({
    queryKey: ["/api/assembly-cards"],
  });
}

export function useAssemblyCard(id: string) {
  return useQuery<AssemblyCard>({
    queryKey: ["/api/assembly-cards", id],
  });
}

export function useCreateAssemblyCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (card: InsertAssemblyCard) => {
      const response = await apiRequest("POST", "/api/assembly-cards", card);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}

export function useUpdateAssemblyCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: UpdateAssemblyCard) => {
      const response = await apiRequest("PATCH", `/api/assembly-cards/${update.id}`, update);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}

export function useDeleteAssemblyCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/assembly-cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}

export function useResetAllAssemblyCardStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assembly-cards/bulk/reset-status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}

export function useDeleteAllAssemblyCards() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/assembly-cards/bulk/delete-all");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}

export function useValidateDependencies() {
  return useMutation({
    mutationFn: async ({ cardNumber, dependencies }: { cardNumber: string; dependencies: string[] }) => {
      const response = await apiRequest("POST", `/api/assembly-cards/${cardNumber}/validate-dependencies`, {
        dependencies,
      });
      return response.json();
    },
  });
}

export function useUpdatePhaseClearedDates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assembly-cards/bulk/update-phase-cleared-dates");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}
