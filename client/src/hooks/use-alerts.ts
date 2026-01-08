import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAlerts() {
  return useQuery({
    queryKey: [api.alertas.list.path],
    queryFn: async () => {
      const res = await fetch(api.alertas.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return api.alertas.list.responses[200].parse(await res.json());
    },
  });
}

export function useUnreadAlertsCount() {
  return useQuery({
    queryKey: [api.alertas.unreadCount.path],
    queryFn: async () => {
      const res = await fetch(api.alertas.unreadCount.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch unread count");
      return api.alertas.unreadCount.responses[200].parse(await res.json());
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
}

export function useMarkAlertAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: number) => {
      const res = await fetch(`/api/alertas/${alertId}/mark-read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark alert as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alertas.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alertas.unreadCount.path] });
    },
  });
}

export function useMarkAllAlertsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/alertas/mark-all-read", {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark all alerts as read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alertas.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alertas.unreadCount.path] });
    },
  });
}
