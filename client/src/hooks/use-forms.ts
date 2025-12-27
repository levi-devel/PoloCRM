import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertModeloFormularioSchema, insertCampoFormularioSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type FormTemplateInput = z.infer<typeof insertModeloFormularioSchema>;
type FormFieldInput = z.infer<typeof insertCampoFormularioSchema>;

export function useFormTemplates() {
  return useQuery({
    queryKey: [api.modelos_formularios.list.path],
    queryFn: async () => {
      const res = await fetch(api.modelos_formularios.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return api.modelos_formularios.list.responses[200].parse(await res.json());
    },
  });
}

export function useFormTemplate(templateId: number | undefined) {
  return useQuery({
    queryKey: ['/api/form-templates', templateId],
    queryFn: async () => {
      if (!templateId) throw new Error("Template ID is required");
      const res = await fetch(`/api/form-templates/${templateId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch template");
      return res.json();
    },
    enabled: !!templateId,
  });
}

export function useCreateFormTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: FormTemplateInput & { fields?: FormFieldInput[] }) => {
      const res = await fetch(api.modelos_formularios.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create template");
      return api.modelos_formularios.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.modelos_formularios.list.path] });
      toast({ title: "Sucesso", description: "Modelo criado" });
    },
  });
}

export function useUpdateFormTemplate(templateId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: FormTemplateInput & { fields?: FormFieldInput[] }) => {
      const res = await fetch(`/api/form-templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.modelos_formularios.list.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates', templateId] });
      toast({ title: "Sucesso", description: "Modelo atualizado com sucesso" });
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar modelo. Tente novamente.",
        variant: "destructive"
      });
    },
  });
}



export function useDeleteFormTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/form-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.modelos_formularios.list.path] });
      toast({ title: "Sucesso", description: "Modelo excluído com sucesso" });
    },
    onError: (error) => {
      console.error("Error deleting template:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir modelo.",
        variant: "destructive"
      });
    },
  });
}
