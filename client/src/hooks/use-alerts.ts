import { useQuery } from "@tanstack/react-query";
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

