import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Setting, InsertSetting, UpdateSetting } from "@shared/schema";

export function useSettings() {
  return useQuery<Setting[]>({
    queryKey: ["/api/settings"],
  });
}

export function useSetting(key: string) {
  return useQuery<Setting | null>({
    queryKey: ["/api/settings", key],
  });
}

export function useCreateSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (setting: InsertSetting) => {
      const response = await apiRequest("POST", "/api/settings", setting);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: UpdateSetting) => {
      const response = await apiRequest("PUT", `/api/settings/${update.key}`, update);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}

export function useUpsertSetting() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (setting: { key: string; value: string; description?: string }) => {
      const response = await apiRequest("POST", `/api/settings/upsert`, setting);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}

export function useCalculatePickDueDates() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/assembly-cards/bulk/calculate-pick-due-dates");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assembly-cards"] });
    },
  });
}