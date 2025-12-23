import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useCreateColumn, useUpdateColumn, useDeleteColumn } from "@/hooks/use-columns";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";
import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface KanbanSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
    columns: Array<{ id: number; name: string; order: number; color: string | null; status: string }>;
}

export function KanbanSettings({ isOpen, onClose, projectId, columns }: KanbanSettingsProps) {
    const [editedColumns, setEditedColumns] = useState(columns);
    const [newColumnName, setNewColumnName] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const createColumn = useCreateColumn(projectId);
    const updateColumn = useUpdateColumn();
    const deleteColumn = useDeleteColumn();

    // Sync edited columns with props columns when they change
    React.useEffect(() => {
        setEditedColumns(columns);
    }, [columns]);

    const handleUpdateColumn = async (id: number, updates: Partial<{ name: string; color: string; status: string }>) => {
        setEditedColumns(prev =>
            prev.map(col => col.id === id ? { ...col, ...updates } : col)
        );

        try {
            await updateColumn.mutateAsync({ id, updates });
        } catch (error) {
            // Revert on error
            setEditedColumns(columns);
            toast({
                title: "Erro",
                description: "Falha ao atualizar coluna",
                variant: "destructive"
            });
        }
    };

    const handleAddColumn = async () => {
        if (!newColumnName.trim()) {
            toast({
                title: "Erro",
                description: "Digite um nome para a coluna",
                variant: "destructive"
            });
            return;
        }

        try {
            await createColumn.mutateAsync({
                name: newColumnName,
                order: columns.length,
                color: "#6b7280",
                status: "Em aberto"
            });
            setNewColumnName("");
            toast({ title: "Sucesso", description: "Coluna criada com sucesso" });
        } catch (error) {
            toast({
                title: "Erro",
                description: "Falha ao criar coluna",
                variant: "destructive"
            });
        }
    };

    const handleDeleteColumn = async (id: number) => {
        if (!confirm("Tem certeza que deseja excluir esta coluna? Ela não pode conter cards.")) {
            return;
        }

        try {
            await deleteColumn.mutateAsync(id);
            toast({ title: "Sucesso", description: "Coluna excluída com sucesso" });
        } catch (error: any) {
            toast({
                title: "Erro",
                description: error.message || "Falha ao excluir coluna. Certifique-se de que ela não contém cards.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display">Configurações do Kanban</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Existing Columns */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Colunas Atuais
                        </h3>
                        {editedColumns.map((column) => (
                            <div key={column.id} className="border border-border rounded-lg p-4 bg-card">
                                <div className="flex items-start gap-4">
                                    <div className="mt-2 cursor-move">
                                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                                    </div>

                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                                Nome da Coluna
                                            </label>
                                            <Input
                                                value={column.name}
                                                onChange={(e) => handleUpdateColumn(column.id, { name: e.target.value })}
                                                className="w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                                Cor da Coluna
                                            </label>
                                            <ColorPicker
                                                value={column.color || "#6b7280"}
                                                onChange={(color) => handleUpdateColumn(column.id, { color })}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                                Status da Coluna
                                            </label>
                                            <select
                                                value={column.status || "Em aberto"}
                                                onChange={(e) => handleUpdateColumn(column.id, { status: e.target.value })}
                                                className="w-full p-2 border rounded-md bg-background text-foreground"
                                            >
                                                <option value="Em aberto">📂 Em aberto</option>
                                                <option value="Pausado">⏸️ Pausado</option>
                                                <option value="Concluído">✅ Concluído</option>
                                            </select>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {column.status === "Concluído"
                                                    ? "Cards nesta coluna serão contados como concluídos no Dashboard"
                                                    : "Cards nesta coluna não serão contados como concluídos"}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteColumn(column.id)}
                                        className="hover:bg-red-500/10 hover:text-red-600"
                                        title="Excluir coluna"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add New Column */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                            Adicionar Nova Coluna
                        </h3>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nome da nova coluna..."
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                                className="flex-1"
                            />
                            <Button onClick={handleAddColumn} disabled={createColumn.isPending}>
                                <Plus className="w-4 h-4 mr-2" />
                                {createColumn.isPending ? "Criando..." : "Adicionar"}
                            </Button>
                        </div>
                    </div>

                    {/* Close Button */}
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={onClose} variant="outline">
                            Fechar
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
