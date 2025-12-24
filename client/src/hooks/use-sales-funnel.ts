import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { salesFunnelCards, salesFunnelColumns } from "@shared/schema";

// Fetch columns
export function useSalesFunnelColumns() {
    return useQuery({
        queryKey: [api.salesFunnel.columns.list.path],
        queryFn: async () => {
            const res = await fetch(api.salesFunnel.columns.list.path, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch sales funnel columns');
            return res.json() as Promise<typeof salesFunnelColumns.$inferSelect[]>;
        },
    });
}

// Fetch cards
export function useSalesFunnelCards() {
    return useQuery({
        queryKey: [api.salesFunnel.cards.list.path],
        queryFn: async () => {
            const res = await fetch(api.salesFunnel.cards.list.path, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch sales funnel cards');
            return res.json() as Promise<typeof salesFunnelCards.$inferSelect[]>;
        },
    });
}

// Get single card
export function useSalesFunnelCard(id: number) {
    return useQuery({
        queryKey: ['/api/sales-funnel/cards', id],
        queryFn: async () => {
            const res = await fetch(`/api/sales-funnel/cards/${id}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch sales funnel card');
            return res.json() as Promise<typeof salesFunnelCards.$inferSelect>;
        },
        enabled: !!id,
    });
}

// Create card
export function useCreateSalesFunnelCard() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (card: Omit<typeof salesFunnelCards.$inferInsert, 'id' | 'createdAt'>) => {
            const res = await fetch(api.salesFunnel.cards.create.path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(card),
                credentials: 'include',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to create sales funnel card');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.salesFunnel.cards.list.path] });
        },
    });
}

// Update card
export function useUpdateSalesFunnelCard() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: Partial<Omit<typeof salesFunnelCards.$inferInsert, 'id' | 'createdAt'>> }) => {
            const res = await fetch(`/api/sales-funnel/cards/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to update sales funnel card');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.salesFunnel.cards.list.path] });
        },
    });
}

// Move card to different column
export function useMoveSalesFunnelCard() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, columnId }: { id: number; columnId: number }) => {
            const res = await fetch(`/api/sales-funnel/cards/${id}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columnId }),
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to move sales funnel card');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.salesFunnel.cards.list.path] });
        },
    });
}

// Delete card
export function useDeleteSalesFunnelCard() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/sales-funnel/cards/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) throw new Error('Failed to delete sales funnel card');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.salesFunnel.cards.list.path] });
        },
    });
}
