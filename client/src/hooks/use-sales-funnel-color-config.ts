import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSalesFunnelColorConfig() {
    return useQuery({
        queryKey: ["/api/sales-funnel/config-cores"],
        queryFn: async () => {
            const res = await fetch("/api/sales-funnel/config-cores");
            if (!res.ok) throw new Error("Failed to fetch config");
            return res.json();
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useUpdateSalesFunnelColorConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/sales-funnel/config-cores/${data.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update config");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/sales-funnel/config-cores"] });
        },
    });
}
