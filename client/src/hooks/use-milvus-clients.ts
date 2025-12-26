import { useQuery } from "@tanstack/react-query";
import type { MilvusClientListResponse } from "@shared/milvus-types";

export function useMilvusClients(search?: string) {
    return useQuery({
        queryKey: ["/api/milvus/clients", search],
        queryFn: async () => {
            const url = new URL("/api/milvus/clients", window.location.origin);
            if (search) {
                url.searchParams.append("search", search);
            }

            const res = await fetch(url.toString(), { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch Milvus clients");

            const data: MilvusClientListResponse = await res.json();
            return data.lista || [];
        },
        enabled: true,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
}
