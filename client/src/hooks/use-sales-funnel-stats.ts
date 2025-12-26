import { useQuery } from "@tanstack/react-query";

export function useSalesFunnelStats(startDate?: Date, endDate?: Date) {
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate.toISOString());
    if (endDate) queryParams.append('endDate', endDate.toISOString());

    const queryString = queryParams.toString();
    const url = `/api/sales-funnel/stats${queryString ? `?${queryString}` : ''}`;

    return useQuery({
        queryKey: ['/api/sales-funnel/stats', startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async () => {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch sales funnel stats');
            return res.json();
        },
    });
}
