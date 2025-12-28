import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertProjetoSchema, insertCartaoSchema, insertRespostaCampoFormularioSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type ProjectInput = z.infer<typeof insertProjetoSchema>;
type CardInput = z.infer<typeof insertCartaoSchema>;

export function useProjects() {
  return useQuery({
    queryKey: [api.projetos.list.path],
    queryFn: async () => {
      const res = await fetch(api.projetos.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return api.projetos.list.responses[200].parse(await res.json());
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: [api.projetos.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.projetos.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return api.projetos.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ProjectInput) => {
      const res = await fetch(api.projetos.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create project");
      return api.projetos.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projetos.list.path] });
      toast({ title: "Sucesso", description: "Projeto criado" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProject(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<ProjectInput>) => {
      const url = buildUrl(api.projetos.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update project");
      return api.projetos.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projetos.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projetos.get.path, id] });
      toast({ title: "Sucesso", description: "Projeto atualizado" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

// Cards
export function useCards(projectId: number) {
  return useQuery({
    queryKey: [api.cartoes.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.cartoes.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cards");
      return api.cartoes.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: [api.cartoes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.cartoes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch card details");
      return api.cartoes.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateCard(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<CardInput, "projectId">) => {
      const url = buildUrl(api.cartoes.create.path, { projectId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create card");
      return api.cartoes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cartoes.list.path, projectId] });
      toast({ title: "Sucesso", description: "Cartão criado" });
    },
  });
}

export function useMoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, columnId, projectId }: { id: number; columnId: number; projectId: number }) => {
      const url = buildUrl(api.cartoes.move.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to move card");
      return api.cartoes.move.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.cartoes.list.path, variables.projectId] });
    },
  });
}

export function useSubmitCardForm(cardId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ answers, status }: { status: string; answers: any[] }) => {
      const url = buildUrl(api.cardForms.submit.path, { cardId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, answers }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit form");
      return api.cardForms.submit.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cards/${cardId}`] });
      queryClient.invalidateQueries({ queryKey: [api.cartoes.list.path] });
      toast({ title: "Sucesso", description: "Formulário salvo com sucesso" });
    },
    onError: (error) => {
      console.error("Error submitting form:", error);
      toast({
        title: "Erro",
        description: "Falha ao salvar formulário. Tente novamente.",
        variant: "destructive"
      });
    },
  });
}

export function useUpdateCardBasicInfo(cardId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: {
      description?: string;
      priority?: string;
      startDate?: string | null;
      dueDate?: string | null;
      assignedTechId?: string | null;
    }) => {
      const res = await fetch(`/api/cards/${cardId}/basic-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update card");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cards/${cardId}`] });
      queryClient.invalidateQueries({ queryKey: [api.cartoes.list.path] });
      toast({ title: "Sucesso", description: "Card atualizado com sucesso" });
    },
    onError: (error) => {
      console.error("Error updating card:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar card. Tente novamente.",
        variant: "destructive"
      });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cardId: number) => {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete card");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cartoes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.projetos.list.path] });
      toast({ title: "Sucesso", description: "Card deletado com sucesso" });
    },
    onError: (error) => {
      console.error("Error deleting card:", error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao deletar card. Apenas Gerentes podem deletar cards.",
        variant: "destructive"
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(buildUrl(api.projetos.delete.path, { id }), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Você não tem permissão para excluir projetos.");
        }
        throw new Error("Falha ao excluir projeto");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projetos.list.path] });
      toast({ title: "Sucesso", description: "Projeto excluído com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

