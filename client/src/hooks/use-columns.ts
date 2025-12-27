import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Hook to create a new column
// Hook to create a new column
export function useCreateColumn(projectId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (column: { nome: string; ordem: number; cor?: string; status?: string }) => {
            const res = await fetch(`/api/projects/${projectId}/columns`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(column),
            });
            if (!res.ok) throw new Error("Failed to create column");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
        },
    });
}

// Hook to update a column
export function useUpdateColumn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, updates }: { id: number; updates: { nome?: string; ordem?: number; cor?: string; status?: string } }) => {
            const res = await fetch(`/api/columns/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error("Failed to update column");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [/^\/api\/projects/] });
        },
    });
}

// Hook to delete a column
export function useDeleteColumn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/columns/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to delete column");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [/^\/api\/projects/] });
        },
    });
}
