import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertProjectSchema, insertCardSchema, insertCardFormAnswerSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type ProjectInput = z.infer<typeof insertProjectSchema>;
type CardInput = z.infer<typeof insertCardSchema>;

export function useProjects() {
  return useQuery({
    queryKey: [api.projects.list.path],
    queryFn: async () => {
      const res = await fetch(api.projects.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch projects");
      return api.projects.list.responses[200].parse(await res.json());
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: [api.projects.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.projects.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return api.projects.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ProjectInput) => {
      const res = await fetch(api.projects.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create project");
      return api.projects.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.projects.list.path] });
      toast({ title: "Success", description: "Project created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// Cards
export function useCards(projectId: number) {
  return useQuery({
    queryKey: [api.cards.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.cards.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch cards");
      return api.cards.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCard(id: number) {
  return useQuery({
    queryKey: [api.cards.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.cards.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch card details");
      return api.cards.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateCard(projectId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<CardInput, "projectId">) => {
      const url = buildUrl(api.cards.create.path, { projectId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create card");
      return api.cards.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.cards.list.path, projectId] });
      toast({ title: "Success", description: "Card created" });
    },
  });
}

export function useMoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, columnId, projectId }: { id: number; columnId: number; projectId: number }) => {
      const url = buildUrl(api.cards.move.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to move card");
      return api.cards.move.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.cards.list.path, variables.projectId] });
    },
  });
}

export function useSubmitCardForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cardId, answers, status }: { cardId: number; status: string; answers: any[] }) => {
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.cards.get.path, variables.cardId] });
      toast({ title: "Success", description: "Form saved successfully" });
    },
  });
}
