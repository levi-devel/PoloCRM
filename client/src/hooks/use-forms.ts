import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { insertFormTemplateSchema, insertFormFieldSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

type FormTemplateInput = z.infer<typeof insertFormTemplateSchema>;
type FormFieldInput = z.infer<typeof insertFormFieldSchema>;

export function useFormTemplates() {
  return useQuery({
    queryKey: [api.formTemplates.list.path],
    queryFn: async () => {
      const res = await fetch(api.formTemplates.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return api.formTemplates.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateFormTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: FormTemplateInput & { fields?: FormFieldInput[] }) => {
      const res = await fetch(api.formTemplates.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create template");
      return api.formTemplates.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.formTemplates.list.path] });
      toast({ title: "Success", description: "Template created" });
    },
  });
}
