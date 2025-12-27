import { Layout } from "@/components/layout/Layout";
import { useFormTemplates, useCreateFormTemplate, useUpdateFormTemplate, useDeleteFormTemplate } from "@/hooks/use-forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Edit2, GripVertical } from "lucide-react";
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const templateSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    descricao: z.string().optional(),
    versao: z.string().optional(),
});

const fieldSchema = z.object({
    label: z.string().min(1, "Label é obrigatório"),
    type: z.enum(["text", "textarea", "number", "date", "checkbox", "list", "client"]),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
});

export default function FormTemplates() {
    const { data: templates, isLoading } = useFormTemplates();
    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [isEditOpen, setIsEditOpen] = React.useState(false);
    const [selectedTemplate, setSelectedTemplate] = React.useState<any>(null);
    const [fields, setFields] = React.useState<any[]>([]);
    const [editingFieldIndex, setEditingFieldIndex] = React.useState<number | null>(null);
    const [templateToDelete, setTemplateToDelete] = React.useState<any>(null);

    const deleteTemplate = useDeleteFormTemplate();

    const handleDeleteClick = (template: any) => {
        setTemplateToDelete(template);
    };

    const handleConfirmDelete = async () => {
        if (templateToDelete) {
            await deleteTemplate.mutateAsync(templateToDelete.id);
            setTemplateToDelete(null);
        }
    };

    const form = useForm<z.infer<typeof templateSchema>>({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            nome: "",
            descricao: "",
            versao: "1.0",
        },
    });

    const fieldForm = useForm<z.infer<typeof fieldSchema>>({
        resolver: zodResolver(fieldSchema),
        defaultValues: {
            label: "",
            type: "text",
            required: false,
            options: [],
        },
    });

    const createTemplate = useCreateFormTemplate();
    // Always call hooks unconditionally - use default ID of 0 if no template selected
    const updateTemplate = useUpdateFormTemplate(selectedTemplate?.id || 0);

    // Open edit dialog with template data
    const handleEditClick = async (template: any) => {
        // Fetch the complete template with fields
        try {
            const response = await fetch(`/api/form-templates/${template.id}`, {
                credentials: "include"
            });
            if (!response.ok) {
                console.error("Failed to fetch template");
                return;
            }
            const fullTemplate = await response.json();

            setSelectedTemplate(fullTemplate);
            form.reset({
                nome: fullTemplate.nome,
                descricao: fullTemplate.descricao || "",
                versao: fullTemplate.versao || "1.0"
            });

            // Load existing fields (if fields are included in template)
            if (fullTemplate.fields && fullTemplate.fields.length > 0) {
                setFields(fullTemplate.fields.map((f: any) => ({
                    label: f.rotulo,
                    type: f.tipo,
                    required: f.obrigatorio,
                    options: f.opcoes || [],
                    order: f.ordem
                })));
            } else {
                setFields([]);
            }

            setIsEditOpen(true);
        } catch (error) {
            console.error("Error fetching template:", error);
        }
    };

    const addField = (data: z.infer<typeof fieldSchema>) => {
        // Clean up options if it's a list
        const cleanData = { ...data };
        if (cleanData.type === 'list' && cleanData.options) {
            cleanData.options = cleanData.options.map(o => o.trim()).filter(Boolean);
        }

        if (editingFieldIndex !== null) {
            // Update existing field
            const newFields = [...fields];
            newFields[editingFieldIndex] = { ...cleanData, order: newFields[editingFieldIndex].order };
            setFields(newFields);
            setEditingFieldIndex(null);
            fieldForm.reset({
                label: "",
                type: "text",
                required: false,
                options: []
            });
        } else {
            // Add new field
            setFields([...fields, { ...cleanData, order: fields.length + 1 }]);
            fieldForm.reset({
                label: "",
                type: "text",
                required: false,
                options: []
            });
        }
    };

    const startEditingField = (index: number) => {
        const field = fields[index];
        setEditingFieldIndex(index);
        fieldForm.reset({
            label: field.label,
            type: field.type,
            required: field.required,
            options: field.options || [],
        });
    };

    const cancelEditingField = () => {
        setEditingFieldIndex(null);
        fieldForm.reset({
            label: "",
            type: "text",
            required: false,
            options: []
        });
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    const moveField = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === fields.length - 1)) return;

        const newFields = [...fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        // Update order
        newFields.forEach((field, i) => {
            field.order = i + 1;
        });

        setFields(newFields);
    };

    const onSubmit = async (data: z.infer<typeof templateSchema>) => {
        try {
            await createTemplate.mutateAsync({
                ...data,
                ativo: true,
                fields: fields.map((f, idx) => ({
                    rotulo: f.label,
                    tipo: f.type,
                    obrigatorio: f.required,
                    opcoes: f.options,
                    ordem: idx + 1,
                    id_modelo: 0
                })),
            });
            setIsCreateOpen(false);
            form.reset();
            setFields([]);
        } catch (error) {
            console.error("Error creating template:", error);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex flex-col gap-6 p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold">Modelos de Formulário</h1>
                        <p className="text-muted-foreground mt-1">Gerencie os templates de formulários dos cards</p>
                    </div>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Modelo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Criar Novo Modelo de Formulário</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-6">
                                {/* Template Info */}
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="nome"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nome do Modelo *</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ex: Formulário de Desenvolvimento" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="descricao"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Descrição</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Descreva o propósito deste modelo..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="versao"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Versão</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="1.0" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        {/* Field Builder */}
                                        <div className="border-t pt-6 mt-6">
                                            <h3 className="text-lg font-semibold mb-4">Campos do Formulário</h3>

                                            {/* Add Field Form */}
                                            <div className="grid grid-cols-2 gap-4 mb-4 p-4 border rounded-lg bg-muted/30">
                                                <FormField
                                                    control={fieldForm.control}
                                                    name="label"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Label do Campo</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Nome do Cliente" {...field} />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                <FormField
                                                    control={fieldForm.control}
                                                    name="type"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Tipo</FormLabel>
                                                            <FormControl>
                                                                <select {...field} className="w-full p-2 border rounded-md">
                                                                    <option value="text">Texto Curto</option>
                                                                    <option value="textarea">Texto Longo</option>
                                                                    <option value="number">Número</option>
                                                                    <option value="date">Data</option>
                                                                    <option value="checkbox">Checkbox</option>
                                                                    <option value="list">Lista (Dropdown)</option>
                                                                    <option value="client">Cliente</option>
                                                                </select>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                {fieldForm.watch("type") === "list" && (
                                                    <div className="col-span-2">
                                                        <FormLabel>Opções (separadas por vírgula)</FormLabel>
                                                        <Input
                                                            placeholder="Opção 1, Opção 2, Opção 3"
                                                            value={fieldForm.watch("options")?.join(", ") || ""}
                                                            onChange={(e) => {
                                                                const options = e.target.value.split(',').map(o => o.trim()).filter(Boolean); // keep empty strings out
                                                                // But to allow typing comma, we need a better approach or just let them type and split on blur?
                                                                // Simple approach: split by comma but filter boolean only for final submission.
                                                                // Better: Just update the options array.
                                                                // Actually for better UX let's just use the value directly split.
                                                                fieldForm.setValue("options", e.target.value.split(','));
                                                            }}
                                                        />
                                                    </div>
                                                )}

                                                <FormField
                                                    control={fieldForm.control}
                                                    name="required"
                                                    render={({ field }) => (
                                                        <FormItem className="flex items-center gap-2">
                                                            <FormLabel className="mt-2">Obrigatório</FormLabel>
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-4 h-4"
                                                                    checked={field.value}
                                                                    onChange={field.onChange}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />

                                                <div className="flex items-end gap-2">
                                                    <Button
                                                        type="button"
                                                        onClick={fieldForm.handleSubmit(addField)}
                                                        variant={editingFieldIndex !== null ? "default" : "outline"}
                                                        className="w-full"
                                                    >
                                                        {editingFieldIndex !== null ? (
                                                            <>
                                                                <Edit2 className="w-4 h-4 mr-2" />
                                                                Atualizar Campo
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Adicionar Campo
                                                            </>
                                                        )}
                                                    </Button>
                                                    {editingFieldIndex !== null && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={cancelEditingField}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Fields List */}
                                            <div className="space-y-2">
                                                {fields.length === 0 ? (
                                                    <p className="text-center text-muted-foreground py-8">
                                                        Nenhum campo adicionado ainda. Use o formulário acima para adicionar campos.
                                                    </p>
                                                ) : (
                                                    fields.map((field, index) => (
                                                        <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
                                                            <div className="flex flex-col gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => moveField(index, 'up')}
                                                                    disabled={index === 0}
                                                                    className="h-4 p-0"
                                                                >
                                                                    ▲
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => moveField(index, 'down')}
                                                                    disabled={index === fields.length - 1}
                                                                    className="h-4 p-0"
                                                                >
                                                                    ▼
                                                                </Button>
                                                            </div>

                                                            <GripVertical className="w-4 h-4 text-muted-foreground" />

                                                            <div className="flex-1">
                                                                <p className="font-medium">{field.label}</p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {field.type} {field.required && "• Obrigatório"}
                                                                    {field.options && ` • ${field.options.length} opções`}
                                                                </p>
                                                            </div>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => startEditingField(index)}
                                                            >
                                                                <Edit2 className="w-4 h-4 text-primary" />
                                                            </Button>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeField(index)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-4 border-t">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsCreateOpen(false);
                                                    form.reset();
                                                    setIsCreateOpen(false);
                                                    form.reset();
                                                    setFields([]);
                                                    setEditingFieldIndex(null);
                                                    fieldForm.reset();
                                                }}
                                                className="flex-1"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="flex-1"
                                                disabled={createTemplate.isPending || fields.length === 0}
                                            >
                                                {createTemplate.isPending ? "Criando..." : "Criar Modelo"}
                                            </Button>
                                        </div>
                                    </form>
                                </Form>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Template Dialog */}
                    <Dialog open={isEditOpen} onOpenChange={(open) => {
                        setIsEditOpen(open);
                        if (!open) {
                            setSelectedTemplate(null);
                            setFields([]);
                            form.reset();
                            setEditingFieldIndex(null);
                            fieldForm.reset();
                        }
                    }}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Editar Modelo de Formulário</DialogTitle>
                            </DialogHeader>

                            {selectedTemplate && (
                                <div className="space-y-6">
                                    {/* Template Info */}
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(async (data) => {
                                            try {
                                                if (!selectedTemplate) {
                                                    console.error("No template selected");
                                                    return;
                                                }
                                                await updateTemplate.mutateAsync({
                                                    ...data,
                                                    ativo: selectedTemplate.ativo !== false, // Preserve active status
                                                    fields: fields.map((f, idx) => ({
                                                        rotulo: f.label,
                                                        tipo: f.type,
                                                        obrigatorio: f.required,
                                                        opcoes: f.options,
                                                        ordem: idx + 1,
                                                        id_modelo: 0
                                                    })),
                                                });
                                                setIsEditOpen(false);
                                                form.reset();
                                                setFields([]);
                                            } catch (error) {
                                                console.error("Error updating template:", error);
                                            }
                                        })} className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="nome"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nome do Modelo *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ex: Formulário de Desenvolvimento" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="descricao"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Descrição</FormLabel>
                                                        <FormControl>
                                                            <Textarea placeholder="Descreva o propósito deste modelo..." {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="versao"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Versão</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="1.0" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            {/* Field Builder */}
                                            <div className="border-t pt-6 mt-6">
                                                <h3 className="text-lg font-semibold mb-4">Campos do Formulário</h3>

                                                {/* Add Field Form - Same as create dialog */}
                                                <div className="grid grid-cols-2 gap-4 mb-4 p-4 border rounded-lg bg-muted/30">
                                                    <FormField
                                                        control={fieldForm.control}
                                                        name="label"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Label do Campo</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Ex: Nome do Cliente" {...field} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={fieldForm.control}
                                                        name="type"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Tipo</FormLabel>
                                                                <FormControl>
                                                                    <select {...field} className="w-full p-2 border rounded-md">
                                                                        <option value="text">Texto Curto</option>
                                                                        <option value="textarea">Texto Longo</option>
                                                                        <option value="number">Número</option>
                                                                        <option value="date">Data</option>
                                                                        <option value="checkbox">Checkbox</option>
                                                                        <option value="list">Lista (Dropdown)</option>
                                                                        <option value="client">Cliente</option>
                                                                    </select>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    {fieldForm.watch("type") === "list" && (
                                                        <div className="col-span-2">
                                                            <FormLabel>Opções (separadas por vírgula)</FormLabel>
                                                            <Input
                                                                placeholder="Opção 1, Opção 2, Opção 3"
                                                                value={fieldForm.watch("options")?.join(", ") || ""}
                                                                onChange={(e) => {
                                                                    fieldForm.setValue("options", e.target.value.split(','));
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    <FormField
                                                        control={fieldForm.control}
                                                        name="required"
                                                        render={({ field }) => (
                                                            <FormItem className="flex items-center gap-2">
                                                                <FormLabel className="mt-2">Obrigatório</FormLabel>
                                                                <FormControl>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-4 h-4"
                                                                        checked={field.value}
                                                                        onChange={field.onChange}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <div className="flex items-end gap-2">
                                                        <Button
                                                            type="button"
                                                            onClick={fieldForm.handleSubmit(addField)}
                                                            variant={editingFieldIndex !== null ? "default" : "outline"}
                                                            className="w-full"
                                                        >
                                                            {editingFieldIndex !== null ? (
                                                                <>
                                                                    <Edit2 className="w-4 h-4 mr-2" />
                                                                    Atualizar Campo
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Plus className="w-4 h-4 mr-2" />
                                                                    Adicionar Campo
                                                                </>
                                                            )}
                                                        </Button>
                                                        {editingFieldIndex !== null && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                onClick={cancelEditingField}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Fields List */}
                                                <div className="space-y-2">
                                                    {fields.length === 0 ? (
                                                        <p className="text-center text-muted-foreground py-8">
                                                            Nenhum campo adicionado ainda. Use o formulário acima para adicionar campos.
                                                        </p>
                                                    ) : (
                                                        fields.map((field, index) => (
                                                            <div key={index} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
                                                                <div className="flex flex-col gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => moveField(index, 'up')}
                                                                        disabled={index === 0}
                                                                        className="h-4 p-0"
                                                                    >
                                                                        ▲
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => moveField(index, 'down')}
                                                                        disabled={index === fields.length - 1}
                                                                        className="h-4 p-0"
                                                                    >
                                                                        ▼
                                                                    </Button>
                                                                </div>

                                                                <GripVertical className="w-4 h-4 text-muted-foreground" />

                                                                <div className="flex-1">
                                                                    <p className="font-medium">{field.label}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {field.type} {field.required && "• Obrigatório"}
                                                                        {field.options && ` • ${field.options.length} opções`}
                                                                    </p>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => startEditingField(index)}
                                                                >
                                                                    <Edit2 className="w-4 h-4 text-primary" />
                                                                </Button>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeField(index)}
                                                                >
                                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                                </Button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-3 pt-4 border-t">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsEditOpen(false);
                                                        form.reset();
                                                        setIsEditOpen(false);
                                                        form.reset();
                                                        setFields([]);
                                                        setEditingFieldIndex(null);
                                                        fieldForm.reset();
                                                    }}
                                                    className="flex-1"
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    className="flex-1"
                                                    disabled={fields.length === 0}
                                                >
                                                    Salvar Alterações
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates?.map((template: any) => (
                        <Card key={template.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{template.nome}</span>
                                    {template.isActive && (
                                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                                            Ativo
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {template.descricao || "Sem descrição"}
                                </p>
                                <div className="text-sm">
                                    <p className="text-muted-foreground">
                                        Versão: {template.versao || "1.0"}
                                    </p>
                                    <p className="text-muted-foreground">
                                        Criado: {new Date(template.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleEditClick(template)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteClick(template)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Excluir
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o modelo "{templateToDelete?.nome}" e todos os seus campos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteTemplate.isPending ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Layout>
    );
}
