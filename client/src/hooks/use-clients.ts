import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertClienteSchema, insertDocumentoClienteSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type ClientInput = z.infer<typeof insertClienteSchema>;
type ClientDocInput = z.infer<typeof insertDocumentoClienteSchema>;

export function useClients() {
  return useQuery({
    queryKey: [api.clientes.list.path],
    queryFn: async () => {
      const res = await fetch(api.clientes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return api.clientes.list.responses[200].parse(await res.json());
    },
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: [api.clientes.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.clientes.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch client");
      return api.clientes.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ClientInput) => {
      const res = await fetch(api.clientes.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create client");
      return api.clientes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.clientes.list.path] });
      toast({ title: "Sucesso", description: "Cliente criado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateClient(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<ClientInput>) => {
      const url = buildUrl(api.clientes.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update client");
      return api.clientes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.clientes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.clientes.get.path, id] });
      toast({ title: "Sucesso", description: "Cliente atualizado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}

export function useClientDocs(clientId: number) {
  return useQuery({
    queryKey: [api.documentos_clientes.list.path, clientId],
    queryFn: async () => {
      const url = buildUrl(api.documentos_clientes.list.path, { clientId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch docs");
      return api.documentos_clientes.list.responses[200].parse(await res.json());
    },
    enabled: !!clientId,
  });
}

export function useCreateClientDoc(clientId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<ClientDocInput, "clientId">) => {
      const url = buildUrl(api.documentos_clientes.create.path, { clientId });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, clientId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add document");
      return api.documentos_clientes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documentos_clientes.list.path, clientId] });
      toast({ title: "Sucesso", description: "Documento adicionado" });
    },
    onError: (error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });
}


