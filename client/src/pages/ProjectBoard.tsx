import { Layout } from "@/components/layout/Layout";
import { useProject, useCards, useCreateCard, useMoveCard, useCard, useSubmitCardForm, useUpdateCardBasicInfo, useDeleteCard } from "@/hooks/use-projects";
import { useFormTemplate } from "@/hooks/use-forms";
import { useClients } from "@/hooks/use-clients";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Calendar, FileText, Settings, Trash2, Search, ArrowLeft, Upload, Eye, Download, X } from "lucide-react";
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
import { CNPJInput } from "@/components/ui/cnpj-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { KanbanSettings } from "@/components/kanban/KanbanSettings";
import { MultiUserSelect } from "@/components/MultiUserSelect";

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
        <option key={client.id} value={client.id.toString()}>
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
function KanbanColumn({ title, id, cards, onAddCard, onCardClick, onDeleteCard, color, users, canDelete }: any) {
  // Helper to get ALL assigned users for a card (returns array of names)
  const getAssignedUsers = (card: any): string[] => {
    // Priority 1: Get from usuariosAtribuidos (array of user IDs from cartoes_usuarios)
    if (card.usuariosAtribuidos && card.usuariosAtribuidos.length > 0 && users) {
      return card.usuariosAtribuidos
        .map((userId: string) => {
          const user = users.find((u: any) => u.id === userId);
          return user ? `${user.firstName} ${user.lastName}` : null;
        })
        .filter(Boolean) as string[];
    }

    // Priority 2: Fallback to id_tecnico_atribuido (legacy field)
    if (card.id_tecnico_atribuido && users) {
      const user = users.find((u: any) => u.id === card.id_tecnico_atribuido);
      if (user) {
        return [`${user.firstName} ${user.lastName}`];
      }
    }

    return [];
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
              const assignedUsers = getAssignedUsers(card);

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
                          {canDelete && (
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
                          )}
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
                          {assignedUsers.length > 0 && (
                            <>
                              <span className="text-[10px] text-muted-foreground/50">•</span>
                              <span className="text-[10px] font-medium text-primary">
                                {assignedUsers.length === 1
                                  ? assignedUsers[0]
                                  : `${assignedUsers.length} técnicos`}
                              </span>
                            </>
                          )}
                        </div>
                        {/* Stacked Avatars for multiple technicians */}
                        {assignedUsers.length > 0 && (
                          <div className="flex -space-x-2">
                            {assignedUsers.slice(0, 3).map((name: string, idx: number) => (
                              <div
                                key={idx}
                                className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border-2 border-background"
                                title={name}
                              >
                                {name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                            ))}
                            {assignedUsers.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background">
                                +{assignedUsers.length - 3}
                              </div>
                            )}
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
  const [, setLocation] = useLocation();
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNewCardUsers, setSelectedNewCardUsers] = useState<string[]>([]);

  const { data: selectedCard } = useCard(selectedCardId || 0);
  const deleteCard = useDeleteCard();
  const { user } = useAuth();

  // Check permissions - apenas Admin e Gerentes podem excluir cards
  const canDelete = user?.role === "Admin" || user?.role === "Gerente Supervisor" || user?.role === "Gerente Comercial";

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
    // Auto-assign current user to the new card
    if (user?.id) {
      setSelectedNewCardUsers([user.id]);
    }
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
      onSuccess: (newCard) => {
        // After creating the card, assign the selected users to it
        if (selectedNewCardUsers.length > 0 && newCard?.id) {
          fetch(`/api/cards/${newCard.id}/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: selectedNewCardUsers }),
            credentials: 'include'
          })
            .then(() => {
              // Refetch cards to show the updated card with assigned users
              refetch();
            })
            .catch(error => {
              console.error('Failed to assign users to card:', error);
            });
        }
        setIsAddOpen(false);
        form.reset();
        setSelectedNewCardUsers([]); // Reset selected users
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

  const getCardsForColumn = (colId: number) => {
    const columnCards = cards.filter(c => c.id_coluna === colId);
    if (!searchTerm.trim()) return columnCards;
    return columnCards.filter(card =>
      card.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return (
    <Layout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <Button
          variant="ghost"
          onClick={() => setLocation('/projects')}
          className="mb-4 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Projetos
        </Button>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display">{project.nome}</h1>
            <p className="text-sm text-muted-foreground">{project.descricao}</p>
          </div>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar cartões por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
                  canDelete={canDelete}
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

                {/* Users Selection */}
                <div className="space-y-2">
                  <FormLabel>Participantes do Cartão</FormLabel>
                  <MultiUserSelect
                    users={users || []}
                    selectedUserIds={selectedNewCardUsers}
                    onChange={(userIds: string[]) => setSelectedNewCardUsers(userIds)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Por padrão, você está atribuído ao card. Adicione ou remova participantes conforme necessário.
                  </p>
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
  const { data: clients } = useClients();
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
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);

  // Ref to track if initial data has been loaded (prevents auto-save during init)
  const isInitializedRef = React.useRef(false);

  // Editable basic card info
  const [editableDescription, setEditableDescription] = React.useState(card.descricao || '');
  const [editablePriority, setEditablePriority] = React.useState(card.prioridade || 'Média');
  const [editableStartDate, setEditableStartDate] = React.useState(
    dateToInputValue(card.data_inicio)
  );
  const [editableDueDate, setEditableDueDate] = React.useState(
    dateToInputValue(card.data_prazo)
  );

  // IMPORTANT: Load from SERVER first, then merge with localStorage
  // This ensures all users see the same data (especially file attachments)
  React.useEffect(() => {
    // Mark as not initialized when card changes (e.g., different card opened)
    isInitializedRef.current = false;

    // STEP 1: Always load server data first
    const serverValues: Record<string, any> = {};

    console.log("[DEBUG] Carregando dados do card:", card.id);
    console.log("[DEBUG] formAnswers do servidor:", card.formAnswers);
    console.log("[DEBUG] formResponse do servidor:", card.formResponse);

    // Load assigned users from the card data
    // usuariosAtribuidos is an array of user IDs from the server
    // ALWAYS set selectedUserIds to stay in sync with server
    setSelectedUserIds(card.usuariosAtribuidos || []);

    // Load form answers from server
    if (card.formAnswers && card.formAnswers.length > 0) {
      card.formAnswers.forEach((answer: any) => {
        if (answer.id_campo) {
          if (answer.valor_texto !== null && answer.valor_texto !== undefined) serverValues[`field_${answer.id_campo}`] = answer.valor_texto;
          if (answer.valor_numero !== null && answer.valor_numero !== undefined) serverValues[`field_${answer.id_campo}`] = answer.valor_numero;
          if (answer.valor_data) serverValues[`field_${answer.id_campo}`] = answer.valor_data;
          if (answer.valor_booleano !== null && answer.valor_booleano !== undefined) serverValues[`field_${answer.id_campo}`] = answer.valor_booleano;
          if (answer.valor_lista !== null && answer.valor_lista !== undefined) serverValues[`field_${answer.id_campo}`] = answer.valor_lista;
          if (answer.anexos) serverValues[`field_${answer.id_campo}`] = answer.anexos;
        }
      });
    }

    // STEP 2: CRITICAL - Only use localStorage for basic info edits (description/priority/dates)
    // NEVER override server data for: user selection, form fields with saved data
    const savedData = localStorage.getItem(`card_${card.id}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);

        // ALWAYS use server data for form values
        // This ensures all users see the same saved data
        setFormValues(serverValues);

        // DO NOT use localStorage for selectedUserId
        // User assignments must sync between all users
        // Keep the server value already set above

        // ONLY load basic card info edits from localStorage if user is currently editing
        // These are temporary edits that haven't been saved yet
        if (parsed.description !== undefined) setEditableDescription(parsed.description);
        if (parsed.priority !== undefined) setEditablePriority(parsed.priority);
        if (parsed.startDate !== undefined) setEditableStartDate(parsed.startDate);
        if (parsed.dueDate !== undefined) setEditableDueDate(parsed.dueDate);
      } catch (e) {
        console.error('Error loading from localStorage:', e);
        // Fallback to server data only
        setFormValues(serverValues);
      }
    } else {
      // No localStorage: use only server data
      setFormValues(serverValues);
    }

    // Mark as initialized AFTER setting state values
    // Use setTimeout to ensure this runs after state updates are processed
    setTimeout(() => {
      isInitializedRef.current = true;
    }, 0);
  }, [card.id, card.formAnswers, card.descricao, card.prioridade, card.data_inicio, card.data_prazo, card.usuariosAtribuidos]);

  // Auto-save assigned users when they change
  React.useEffect(() => {
    // Skip auto-save during initialization to prevent race conditions
    if (!isInitializedRef.current) {
      return;
    }

    const currentUserIds = card.usuariosAtribuidos || [];
    const hasChanged = selectedUserIds.length !== currentUserIds.length ||
      selectedUserIds.some(id => !currentUserIds.includes(id)) ||
      currentUserIds.some((id: string) => !selectedUserIds.includes(id));

    if (hasChanged) {
      // Update the users via the new endpoint
      fetch(`/api/cards/${card.id}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUserIds }),
        credentials: 'include'
      }).catch(error => {
        console.error('Failed to auto-save card users:', error);
      });
    }
  }, [selectedUserIds, card.usuariosAtribuidos, card.id]);

  // Save to localStorage whenever values change
  React.useEffect(() => {
    const dataToSave = {
      formValues,
      selectedUserIds,
      description: editableDescription,
      priority: editablePriority,
      startDate: editableStartDate,
      dueDate: editableDueDate,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`card_${card.id}`, JSON.stringify(dataToSave));
  }, [formValues, selectedUserIds, editableDescription, editablePriority, editableStartDate, editableDueDate, card.id]);

  const handleInputChange = (fieldId: number, value: any, field?: any) => {
    setFormValues(prev => ({
      ...prev,
      [`field_${fieldId}`]: value
    }));

    // Se é um campo de cliente, buscar o CNPJ automaticamente
    if (field && (field.tipo === 'client' || field.rotulo?.toLowerCase() === 'cliente' || field.rotulo?.toLowerCase() === 'client')) {
      // Encontrar o cliente selecionado pelo ID
      const selectedClient = clients?.find((c: any) => c.id === parseInt(value));

      if (selectedClient && selectedClient.cnpj) {
        // Encontrar o campo CNPJ no template
        const cnpjField = template?.fields?.find((f: any) =>
          f.tipo === 'cnpj' ||
          f.rotulo?.toLowerCase().includes('cnpj')
        );

        if (cnpjField) {
          // Preencher automaticamente o campo CNPJ
          setFormValues(prev => ({
            ...prev,
            [`field_${cnpjField.id}`]: selectedClient.cnpj
          }));
        }
      }
    }
  };

  const handleFileUpload = async (fieldId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/cards/${card.id}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      const data = await response.json();

      // Update form values with new file
      setFormValues(prev => {
        const existingFiles = prev[`field_${fieldId}`] || [];
        return {
          ...prev,
          [`field_${fieldId}`]: [...existingFiles, data.file]
        };
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Erro ao fazer upload do arquivo");
    }
  };

  const removeFile = (fieldId: number, storedName: string) => {
    setFormValues(prev => {
      const existingFiles = prev[`field_${fieldId}`] || [];
      return {
        ...prev,
        [`field_${fieldId}`]: existingFiles.filter((f: any) => f.storedName !== storedName)
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se template está carregado
    if (!template || !template.fields || template.fields.length === 0) {
      console.error("[ERROR] Template não carregado, não é possível salvar o formulário");
      alert("Erro: Template do formulário não está disponível. Feche e abra o card novamente.");
      return;
    }

    console.log("[DEBUG] Salvando formulário com", template.fields.length, "campos");
    console.log("[DEBUG] formValues atuais:", formValues);

    // Convert formValues to answers format
    const answers = template?.fields?.map((field: any) => {
      const value = formValues[`field_${field.id}`];
      const answer: any = { id_campo: field.id };

      switch (field.tipo) {
        case 'text':
        case 'textarea':
        case 'client':
        case 'cnpj':
          answer.valor_texto = value || '';
          break;
        case 'number':
          answer.valor_numero = value ? parseFloat(value) : null;
          break;
        case 'date':
          // Ensure the date is converted to a Date object or null
          // This prevents TypeORM errors in production where toISOString() is called on strings
          answer.valor_data = value ? (value instanceof Date ? value : new Date(value)) : null;
          break;
        case 'checkbox':
          answer.valor_booleano = value === true;
          break;
        case 'select':
        case 'list':
          answer.valor_lista = value || null;
          break;
        case 'file':
          answer.anexos = value || [];
          break;
      }

      return answer;
    }) || [];

    try {
      await submitCardForm.mutateAsync({
        status: "Em preenchimento",
        answers
      });

      // Clear localStorage to force fresh data load on next open
      // This ensures all users see the latest data from server
      localStorage.removeItem(`card_${card.id}`);

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
          <label className="text-sm font-medium">Responsáveis pelo Card</label>
          <MultiUserSelect
            users={users || []}
            selectedUserIds={selectedUserIds}
            onChange={setSelectedUserIds}
            placeholder="Selecione os usuários..."
          />
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

            // Detectar se é um campo de telefone pelo label
            const isPhoneField = field.rotulo?.toLowerCase().includes('telefone') ||
              field.rotulo?.toLowerCase().includes('phone');

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
                    onChange={(value) => handleInputChange(field.id, value, field)}
                    required={field.obrigatorio}
                  />
                ) : isPhoneField ? (
                  <PhoneInput
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(value) => handleInputChange(field.id, value, field)}
                    required={field.obrigatorio}
                    placeholder="(XX) X XXXX-XXXX"
                  />
                ) : field.tipo === 'text' ? (
                  <Input
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                    required={field.obrigatorio}
                    placeholder={field.rotulo}
                  />
                ) : field.tipo === 'cnpj' ? (
                  <CNPJInput
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(value) => handleInputChange(field.id, value, field)}
                    placeholder="00.000.000/0000-00"
                  />
                ) : field.tipo === 'textarea' ? (
                  <Textarea
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                    required={field.obrigatorio}
                    placeholder={field.rotulo}
                    rows={4}
                    className="w-full"
                  />
                ) : field.tipo === 'number' ? (
                  <Input
                    type="number"
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                    required={field.obrigatorio}
                    placeholder={field.rotulo}
                  />
                ) : field.tipo === 'date' ? (
                  <Input
                    type="date"
                    value={dateToInputValue(formValues[`field_${field.id}`])}
                    onChange={(e) => handleInputChange(field.id, inputValueToDate(e.target.value), field)}
                    required={field.obrigatorio}
                  />
                ) : field.tipo === 'checkbox' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={formValues[`field_${field.id}`] === true}
                      onChange={(e) => handleInputChange(field.id, e.target.checked, field)}
                    />
                    <span className="text-sm text-muted-foreground">Sim</span>
                  </div>
                ) : (field.tipo === 'select' || field.tipo === 'list') && field.opcoes ? (
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formValues[`field_${field.id}`] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value, field)}
                    required={field.obrigatorio}
                  >
                    <option value="">Selecione...</option>
                    {Array.isArray(field.opcoes) && field.opcoes.map((option: string, idx: number) => (
                      <option key={idx} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.tipo === 'file' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors border rounded-md hover:bg-muted/50">
                        <Upload className="w-4 h-4" />
                        <span>Anexar Arquivo</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(field.id, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      {field.obrigatorio && !formValues[`field_${field.id}`]?.length && (
                        <span className="text-xs text-red-500">Obrigatório</span>
                      )}
                    </div>

                    {/* File List */}
                    {formValues[`field_${field.id}`] && formValues[`field_${field.id}`].length > 0 && (
                      <div className="space-y-2">
                        {formValues[`field_${field.id}`].map((file: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/20">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-4 h-4 flex-shrink-0 text-blue-500" />
                              <span className="text-sm truncate max-w-[200px]" title={file.originalName}>
                                {file.originalName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(`/api/cards/${card.id}/view-file?file=${file.storedName}&name=${encodeURIComponent(file.originalName)}`, '_blank')}
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(`/api/cards/${card.id}/download-file?file=${file.storedName}&name=${encodeURIComponent(file.originalName)}`, '_blank')}
                                title="Baixar"
                              >
                                <Download className="w-4 h-4 text-muted-foreground hover:text-primary" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => removeFile(field.id, file.storedName)}
                                title="Remover"
                              >
                                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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


