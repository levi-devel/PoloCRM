import { Layout } from "@/components/layout/Layout";
import { useProject, useCards, useCreateCard, useMoveCard, useCard, useSubmitCardForm, useUpdateCardBasicInfo, useDeleteCard } from "@/hooks/use-projects";
import { useFormTemplate } from "@/hooks/use-forms";
import { useClients } from "@/hooks/use-clients";
import { useRoute } from "wouter";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Calendar, FileText, Settings, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { dateToInputValue, inputValueToDate } from "@/lib/date-utils";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCartaoSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KanbanSettings } from "@/components/kanban/KanbanSettings";

// Client Selector Component
interface ClientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function ClientSelector({ value, onChange, required }: ClientSelectorProps) {
  const { data: clients, isLoading } = useClients();

  if (isLoading) {
    return (
      <select className="w-full p-2 border rounded-md" disabled>
        <option>Carregando clientes...</option>
      </select>
    );
  }

  return (
    <select
      className="w-full p-2 border rounded-md"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">Selecione um cliente...</option>
      {clients?.map((client) => (
        <option key={client.id} value={client.nome}>
          {client.nome}
        </option>
      ))}
    </select>
  );
}

// Delete Confirmation Dialog Component
interface DeleteCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cardTitle: string;
  isDeleting: boolean;
}

function DeleteCardDialog({ isOpen, onClose, onConfirm, cardTitle, isDeleting }: DeleteCardDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Confirmar Exclusão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o card <strong className="text-foreground">'{cardTitle}'</strong>?
          </p>
          <p className="text-sm text-red-600 font-medium">
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              className="flex-1"
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Kanban Column Component
function KanbanColumn({ title, id, cards, onAddCard, onCardClick, onDeleteCard, color, users }: any) {
  // Helper to get assigned user for a card
  const getAssignedUser = (card: any) => {
    // Priority 1: Get from card.assignedTechId (server data)
    if (card.assignedTechId && users) {
      const user = users.find((u: any) => u.id === card.assignedTechId);
      if (user) {
        return `${user.firstName} ${user.lastName}`;
      }
    }

    // Priority 2: Fallback to localStorage (legacy/unsaved data)
    try {
      const savedData = localStorage.getItem(`card_${card.id}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        const userId = parsed.selectedUserId;
        if (userId && users) {
          const user = users.find((u: any) => u.id === userId);
          if (user) {
            return `${user.firstName} ${user.lastName}`;
          }
        }
      }
    } catch (e) {
      console.error('Error getting assigned user:', e);
    }
    return null;
  };

  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-xl border border-border/50 h-[calc(100vh-12rem)]">
      <div
        className="p-4 flex items-center justify-between border-b border-border/50 rounded-t-xl backdrop-blur-sm"
        style={{ backgroundColor: `${color}20` }}
      >
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <span className="text-xs bg-background/50 px-2 py-1 rounded-full text-muted-foreground font-mono">
          {cards.length}
        </span>
      </div>

      <Droppable droppableId={id.toString()}>
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-3"
          >
            {cards.map((card: any, index: number) => {
              const assignedUserName = getAssignedUser(card);

              return (
                <Draggable key={card.id} draggableId={card.id.toString()} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => onCardClick(card)}
                      style={{ ...provided.draggableProps.style }}
                      className={`bg-card p-4 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/50 transition-all ${snapshot.isDragging ? "shadow-xl ring-2 ring-primary/20 rotate-2" : ""
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${card.prioridade === 'Alta' ? 'bg-red-500/10 text-red-600' :
                          card.prioridade === 'Média' ? 'bg-yellow-500/10 text-yellow-600' :
                            'bg-blue-500/10 text-blue-600'
                          }`}>
                          {card.prioridade}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mt-1 hover:bg-red-500/10 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCard(card);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <h4 className="font-medium text-sm mb-1">{card.titulo}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{card.descricao}</p>

                      {/* Dates Section */}
                      <div className="space-y-1 mb-3">
                        {card.data_inicio && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span className="font-medium">Início:</span>
                            <span>{format(new Date(card.data_inicio), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                        {card.data_prazo && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span className="font-medium">Entrega:</span>
                            <span>{format(new Date(card.data_prazo), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px]">#{card.id}</span>
                          {assignedUserName && (
                            <>
                              <span className="text-[10px] text-muted-foreground/50">•</span>
                              <span className="text-[10px] font-medium text-primary">{assignedUserName}</span>
                            </>
                          )}
                        </div>
                        {assignedUserName && (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {assignedUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="p-3 border-t border-border/50">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => onAddCard(id)}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar Cartão
        </Button>
      </div>
    </div>
  );
}

export default function ProjectBoard() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id || "0");
  const { data: project } = useProject(projectId);
  const { data: cards, refetch } = useCards(projectId);
  const moveCard = useMoveCard();
  const createCard = useCreateCard(projectId);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: selectedCard } = useCard(selectedCardId || 0);
  const deleteCard = useDeleteCard();

  // Fetch users for displaying assigned technician names
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });

  // New card form
  const form = useForm({
    resolver: zodResolver(insertCartaoSchema),
    defaultValues: {
      titulo: "",
      descricao: "",
      prioridade: "Média",
      id_projeto: projectId,
      id_coluna: 0,
      data_inicio: null,
      data_prazo: null,
    }
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;

    // Optimistic update could happen here, but for now we rely on mutation + invalidation
    moveCard.mutate({
      id: parseInt(draggableId),
      columnId: parseInt(destination.droppableId),
      projectId
    });
  };

  const handleAddCard = (columnId: number) => {
    setSelectedColumn(columnId);
    form.setValue("id_coluna", columnId);
    form.setValue("id_projeto", projectId);
    setIsAddOpen(true);
  };

  const handleCardClick = (card: any) => {
    setSelectedCardId(card.id);
    setIsCardModalOpen(true);
  };

  const handleDeleteCard = (card: any) => {
    setCardToDelete(card);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    try {
      await deleteCard.mutateAsync(cardToDelete.id);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);
    } catch (error) {
      console.error('Error deleting card:', error);
      // Error toast is handled by the hook
    }
  };

  const onSubmit = (data: any) => {
    createCard.mutate(data, {
      onSuccess: () => {
        setIsAddOpen(false);
        form.reset();
      }
    });
  };

  if (!project || !cards) return <Layout><div className="animate-pulse h-96 bg-muted/20 rounded-2xl" /></Layout>;

  // Group cards by column
  // Note: Assuming `columns` exist on project. If not, we might need default columns.
  const columns = project.columns && project.columns.length > 0
    ? project.columns.sort((a, b) => a.ordem - b.ordem)
    : [
      { id: 1, nome: "A Fazer", ordem: 0, projectId, cor: "#6b7280", status: "Em aberto" },
      { id: 2, nome: "Em Andamento", ordem: 1, projectId, cor: "#3b82f6", status: "Em aberto" },
      { id: 3, nome: "Pendência Interna", ordem: 2, projectId, cor: "#f59e0b", status: "Em aberto" },
      { id: 4, nome: "Pendência Externa", ordem: 3, projectId, cor: "#f59e0b", status: "Em aberto" },
      { id: 5, nome: "Concluído", ordem: 4, projectId, cor: "#10b981", status: "Concluído" }
    ];

  const getCardsForColumn = (colId: number) => cards.filter(c => c.id_coluna === colId);

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">{project.nome}</h1>
            <p className="text-sm text-muted-foreground">{project.descricao}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Visão de Linha do Tempo</Button>
            <Button onClick={() => setIsSettingsOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações do Kanban
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max h-full">
              {columns.map(col => (
                <KanbanColumn
                  key={col.id}
                  id={col.id}
                  title={col.nome}
                  cards={getCardsForColumn(col.id)}
                  onAddCard={handleAddCard}
                  onCardClick={handleCardClick}
                  onDeleteCard={handleDeleteCard}
                  color={col.cor}
                  users={users}
                />
              ))}
            </div>
          </div>
        </DragDropContext>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cartão</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl><Input {...field} value={field.value?.toString() || ''} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl><Textarea {...field} value={field.value?.toString() || ''} /></FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prioridade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridade</FormLabel>
                        <FormControl>
                          <select {...field} value={field.value?.toString() || ''} className="w-full p-2 border rounded-md">
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="data_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateToInputValue(field.value)}
                            onChange={(e) => field.onChange(inputValueToDate(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="data_prazo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Entrega</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateToInputValue(field.value)}
                            onChange={(e) => field.onChange(inputValueToDate(e.target.value))}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full">Criar Cartão</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Card Edit Modal */}
        <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display">
                {selectedCard?.titulo || "Carregando..."}
              </DialogTitle>
            </DialogHeader>

            {selectedCard && selectedCard.formResponse ? (
              <CardEditForm
                card={selectedCard}
                onClose={() => setIsCardModalOpen(false)}
                onUpdate={() => {
                  setIsCardModalOpen(false);
                  refetch();
                }}
              />
            ) : selectedCard ? (
              <div className="space-y-6">
                {/* Card Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-1">Descrição</h3>
                    <p className="text-sm">{selectedCard.descricao || "Sem descrição"}</p>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-1">Prioridade</h3>
                      <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ${selectedCard.prioridade === 'Alta' ? 'bg-red-500/10 text-red-600' :
                        selectedCard.prioridade === 'Baixa' ? 'bg-green-500/10 text-green-600' :
                          'bg-blue-500/10 text-blue-600'
                        }`}>
                        {selectedCard.prioridade}
                      </span>
                    </div>

                    {selectedCard.data_prazo && (
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-1">Data de Entrega</h3>
                        <p className="text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(selectedCard.data_prazo), "dd/MM/yyyy")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Formulário não disponível para este cartão</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Kanban Settings Modal */}
        {
          project && (
            <KanbanSettings
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              projectId={projectId}
              columns={columns}
            />
          )
        }

        {/* Delete Card Confirmation Dialog */}
        <DeleteCardDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setCardToDelete(null);
          }}
          onConfirm={confirmDeleteCard}
          cardTitle={cardToDelete?.titulo || ''}
          isDeleting={deleteCard.isPending}
        />
      </div >
    </Layout >
  );
}

// Separate component for the card edit form
interface CardEditFormProps {
  card: any;
  onClose: () => void;
  onUpdate: () => void;
}

function CardEditForm({ card, onClose, onUpdate }: CardEditFormProps) {
  const { data: template, isLoading: templateLoading } = useFormTemplate(card.formResponse?.id_modelo);
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
  });
  const submitCardForm = useSubmitCardForm(card.id);
  const updateCardBasicInfo = useUpdateCardBasicInfo(card.id);

  const [formValues, setFormValues] = React.useState<Record<string, any>>({});
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);

  // Editable basic card info
  const [editableDescription, setEditableDescription] = React.useState(card.descricao || '');
  const [editablePriority, setEditablePriority] = React.useState(card.prioridade || 'Média');
  const [editableStartDate, setEditableStartDate] = React.useState(
    dateToInputValue(card.data_inicio)
  );
  const [editableDueDate, setEditableDueDate] = React.useState(
    dateToInputValue(card.data_prazo)
  );

  // Load from localStorage on mount
  React.useEffect(() => {
    const savedData = localStorage.getItem(`card_${card.id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormValues(parsed.formValues || {});
        setSelectedUserId(parsed.selectedUserId || null);

        // Load basic info if saved
        if (parsed.description !== undefined) setEditableDescription(parsed.description);
        if (parsed.priority !== undefined) setEditablePriority(parsed.priority);
        if (parsed.startDate !== undefined) setEditableStartDate(parsed.startDate);
        if (parsed.dueDate !== undefined) setEditableDueDate(parsed.dueDate);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    } else {
      // Initialize from server data if no localStorage
      // Load assignedTechId from the card data
      if (card.assignedTechId) {
        setSelectedUserId(card.assignedTechId);
      }

      if (card.formAnswers && card.formAnswers.length > 0) {
        const initialValues: Record<string, any> = {};
        card.formAnswers.forEach((answer: any) => {
          if (answer.id_campo) {
            if (answer.valor_texto) initialValues[`field_${answer.id_campo}`] = answer.valor_texto;
            if (answer.valor_numero) initialValues[`field_${answer.id_campo}`] = answer.valor_numero;
            if (answer.valor_data) initialValues[`field_${answer.id_campo}`] = answer.valor_data;
            if (answer.valor_booleano !== null && answer.valor_booleano !== undefined) initialValues[`field_${answer.id_campo}`] = answer.valor_booleano;
            if (answer.valor_lista) initialValues[`field_${answer.id_campo}`] = answer.valor_lista;
          }
        });
        setFormValues(initialValues);
      }
    }
  }, [card.id, card.formAnswers, card.descricao, card.prioridade, card.data_inicio, card.data_prazo, card.assignedTechId]);

  // Auto-save assignedTechId when it changes
  React.useEffect(() => {
    const currentAssignedTechId = card.assignedTechId || null;
    if (selectedUserId !== currentAssignedTechId) {
      // Only auto-save if the value has actually changed from what's in the server
      updateCardBasicInfo.mutateAsync({
        assignedTechId: selectedUserId,
      }).catch(error => {
        console.error('Failed to auto-save assignedTechId:', error);
      });
    }
  }, [selectedUserId]);

  // Save to localStorage whenever values change
  React.useEffect(() => {
    const dataToSave = {
      formValues,
      selectedUserId,
      description: editableDescription,
      priority: editablePriority,
      startDate: editableStartDate,
      dueDate: editableDueDate,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`card_${card.id}`, JSON.stringify(dataToSave));
  }, [formValues, selectedUserId, editableDescription, editablePriority, editableStartDate, editableDueDate, card.id]);

  const handleInputChange = (fieldId: number, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [`field_${fieldId}`]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert formValues to answers format
    const answers = template?.fields?.map((field: any) => {
      const value = formValues[`field_${field.id}`];
      const answer: any = { id_campo: field.id };

      switch (field.tipo) {
        case 'text':
        case 'textarea':
        case 'client':
          answer.valor_texto = value || '';
          break;
        case 'number':
          answer.valor_numero = value ? parseFloat(value) : null;
          break;
        case 'date':
          answer.valor_data = value || null;
          break;
        case 'checkbox':
          answer.valor_booleano = value === true;
          break;
        case 'select':
        case 'list':
          answer.valor_lista = value || null;
          break;
      }

      return answer;
    }) || [];

    try {
      await submitCardForm.mutateAsync({
        status: "Em preenchimento",
        answers
      });

      // Keep localStorage for later retrieval
      // Don't clear it on successful save

      onUpdate();
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Erro ao salvar o formulário. Verifique o console.");
    }
  };

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template || !template.fields || template.fields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum campo disponível neste formulário</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card Basic Info - Editable */}
      <div className="space-y-4 pb-4 border-b">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">Descrição</label>
            <Textarea
              value={editableDescription}
              onChange={(e) => setEditableDescription(e.target.value)}
              placeholder="Descrição do card"
              className="w-full"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">Prioridade</label>
            <select
              value={editablePriority}
              onChange={(e) => setEditablePriority(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
            </select>
          </div>

          <div className="flex items-end">
            <span className={`inline-block text-sm px-3 py-2 rounded-full font-medium ${editablePriority === 'Alta' ? 'bg-red-500/10 text-red-600' :
              editablePriority === 'Média' ? 'bg-yellow-500/10 text-yellow-600' :
                'bg-blue-500/10 text-blue-600'
              }`}>
              {editablePriority}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Início
            </label>
            <Input
              type="date"
              value={editableStartDate}
              onChange={(e) => setEditableStartDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data de Entrega
            </label>
            <Input
              type="date"
              value={editableDueDate}
              onChange={(e) => setEditableDueDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            await updateCardBasicInfo.mutateAsync({
              description: editableDescription,
              priority: editablePriority,
              startDate: inputValueToDate(editableStartDate),
              dueDate: inputValueToDate(editableDueDate),
              assignedTechId: selectedUserId,
            });
            onUpdate();
          }}
          disabled={updateCardBasicInfo.isPending}
          className="w-full"
        >
          {updateCardBasicInfo.isPending ? "Salvando..." : "Salvar Informações Básicas"}
        </Button>
      </div>

      {/* User Assignment Section */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold font-display text-red-600">USUÁRIOS</h3>
        <div className="space-y-2">
          <label className="text-sm font-medium">Responsável pelo Card</label>
          <select
            className="w-full p-2 border rounded-md"
            value={selectedUserId || ''}
            onChange={(e) => setSelectedUserId(e.target.value || null)}
          >
            <option value="">Selecione um usuário...</option>
            {users?.map((user: any) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName} ({user.email})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Form Fields in 2 Columns */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold font-display flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Formulário do Cartão
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {template.fields.map((field: any) => {
            // Campos de texto longo ocupam toda a largura
            const isFullWidth = field.tipo === 'textarea' || field.rotulo?.toLowerCase().includes('descrição');

            // Detectar se é um campo de cliente pelo tipo ou pelo label
            const isClientField = field.tipo === 'client' ||
              field.rotulo?.toLowerCase() === 'cliente' ||
              field.rotulo?.toLowerCase() === 'client';

            return (
              <div key={field.id} className={`space-y-2 ${isFullWidth ? 'col-span-2' : ''}`}>
                <label className="text-sm font-medium flex items-center gap-2">
                  {field.rotulo}
                  {field.obrigatorio && <span className="text-red-500">*</span>}
                </label>

                {/* Campo de Cliente - Renderiza dropdown de clientes */}
                {isClientField ? (
                  <ClientSelector
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(value) => handleInputChange(field.id, value)}
                    required={field.obrigatorio}
                  />
                ) : field.tipo === 'text' ? (
                  <Input
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.obrigatorio}
                    placeholder={field.rotulo}
                  />
                ) : field.tipo === 'textarea' ? (
                  <Textarea
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.obrigatorio}
                    placeholder={field.rotulo}
                    rows={4}
                    className="w-full"
                  />
                ) : field.tipo === 'number' ? (
                  <Input
                    type="number"
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.obrigatorio}
                    placeholder={field.rotulo}
                  />
                ) : field.tipo === 'date' ? (
                  <Input
                    type="date"
                    value={dateToInputValue(formValues[`field_${field.id}`])}
                    onChange={(e) => handleInputChange(field.id, inputValueToDate(e.target.value))}
                    required={field.obrigatorio}
                  />
                ) : field.tipo === 'checkbox' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={formValues[`field_${field.id}`] === true}
                      onChange={(e) => handleInputChange(field.id, e.target.checked)}
                    />
                    <span className="text-sm text-muted-foreground">Sim</span>
                  </div>
                ) : (field.tipo === 'select' || field.tipo === 'list') && field.opcoes ? (
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    required={field.obrigatorio}
                  >
                    <option value="">Selecione...</option>
                    {Array.isArray(field.opcoes) && field.opcoes.map((option: string, idx: number) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={submitCardForm.isPending}>
          {submitCardForm.isPending ? "Salvando..." : "Salvar Formulário"}
        </Button>
      </div>
    </form>
  );
}


