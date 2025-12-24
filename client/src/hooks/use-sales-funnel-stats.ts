import { useQuery } from "@tanstack/react-query";

export function useSalesFunnelStats() {
    return useQuery({
        queryKey: ['/api/sales-funnel/stats'],
        queryFn: async () => {
            const res = await fetch('/api/sales-funnel/stats', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch sales funnel stats');
            return res.json();
        },
    });
}
