import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Assembler, InsertAssembler } from "@shared/schema";

export function useAssemblers() {
  return useQuery<Assembler[]>({
    queryKey: ["/api/assemblers"],
  });
}

export function useAssembler(id: string) {
  return useQuery<Assembler>({
    queryKey: ["/api/assemblers", id],
  });
}

export function useCreateAssembler() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (assembler: InsertAssembler) => {
      const response = await apiRequest("POST", "/api/assemblers", assembler);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assemblers"] });
    },
  });
}

export function useUpdateAssembler() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InsertAssembler>) => {
      const response = await apiRequest("PATCH", `/api/assemblers/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assemblers"] });
    },
  });
}
