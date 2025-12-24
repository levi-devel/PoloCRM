import { Layout } from "@/components/layout/Layout";
import { useFormTemplates, useCreateFormTemplate } from "@/hooks/use-forms";
import { Button } from "@/components/ui/button";
import { Plus, FileJson, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function Templates() {
  const { data: templates, isLoading } = useFormTemplates();
  const createTemplate = useCreateFormTemplate();
  const [isOpen, setIsOpen] = useState(false);

  // Simple builder state
  const [name, setName] = useState("");
  const [fields, setFields] = useState<any[]>([]);

  const addField = () => {
    setFields([...fields, {
      label: "New Field",
      type: "text",
      required: false,
      order: fields.length
    }]);
  };

  const updateField = (index: number, key: string, value: any) => {
    const newFields = [...fields];
    newFields[index][key] = value;
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    createTemplate.mutate({
      name,
      isActive: true,
      fields: fields
    }, {
      onSuccess: () => {
        setIsOpen(false);
        setName("");
        setFields([]);
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Modelos de Formulário</h1>
            <p className="text-muted-foreground mt-2">Crie formulários personalizados para seus cartões de projeto.</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Novo Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Construtor de Modelos</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Nome do Modelo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Relatório de Bug" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <Label>Campos do Formulário</Label>
                    <Button variant="outline" size="sm" onClick={addField}>+ Adicionar Campo</Button>
                  </div>

                  {fields.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      Nenhum campo adicionado ainda.
                    </div>
                  )}

                  <div className="space-y-3">
                    {fields.map((field, idx) => (
                      <div key={idx} className="flex gap-4 items-start p-4 bg-muted/30 rounded-lg border border-border/50">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <Input
                              placeholder="Rótulo do Campo"
                              value={field.label}
                              onChange={(e) => updateField(idx, 'label', e.target.value)}
                            />
                            <Select
                              value={field.type}
                              onValueChange={(val) => updateField(idx, 'type', val)}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Texto Curto</SelectItem>
                                <SelectItem value="long_text">Texto Longo</SelectItem>
                                <SelectItem value="number">Número</SelectItem>
                                <SelectItem value="date">Data</SelectItem>
                                <SelectItem value="boolean">Caixa de Seleção</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) => updateField(idx, 'required', checked)}
                            />
                            <span className="text-sm text-muted-foreground">Campo obrigatório</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeField(idx)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={handleSave} disabled={createTemplate.isPending || !name}>
                  {createTemplate.isPending ? "Salvando..." : "Salvar Modelo"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-40 bg-muted/20 animate-pulse rounded-2xl" />)
          ) : (
            templates?.map((template) => (
              <div key={template.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                    <FileJson className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded">v{template.version}</span>
                </div>
                <h3 className="text-lg font-bold font-display mt-4">{template.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {template.description || "Sem descrição"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
