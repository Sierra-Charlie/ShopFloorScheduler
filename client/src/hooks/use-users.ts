import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, InsertUser } from "@shared/schema";

export function useUsers() {
  return useQuery<User[]>({
    queryKey: ["/api/users"],
  });
}

export function useUser(id: string) {
  return useQuery<User>({
    queryKey: ["/api/users", id],
    enabled: !!id,
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async (user: InsertUser) => {
      const response = await apiRequest("POST", `/api/users`, user);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
}

export function useUpdateUser() {
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InsertUser>) => {
      const response = await apiRequest("PATCH", `/api/users/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
}