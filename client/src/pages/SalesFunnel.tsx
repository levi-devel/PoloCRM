import { Layout } from "@/components/layout/Layout";
import { useSalesFunnelColumns, useSalesFunnelCards, useCreateSalesFunnelCard, useMoveSalesFunnelCard, useUpdateSalesFunnelCard } from "@/hooks/use-sales-funnel";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, TrendingUp, Search, Filter, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Utility functions for input masks
const formatCNPJ = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Apply CNPJ mask: XX.XXX.XXX/XXXX-XX
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

const formatPhone = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // Apply phone mask: (XX) XXXX-XXXX or (XX) XXXXX-XXXX
    if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : '';
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    // For 11 digits (mobile), format as (XX) XXXXX-XXXX
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatCurrencyInput = (value: string): string => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');

    // If empty, return empty
    if (!numbers) return '';

    // Convert to number (in cents) and format
    const numberValue = parseInt(numbers, 10);
    const formatted = (numberValue / 100).toFixed(2);

    // Split into integer and decimal parts
    const [integerPart, decimalPart] = formatted.split('.');

    // Add thousand separators to integer part
    const withThousandSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    // Return formatted with R$ prefix
    return `R$ ${withThousandSeparators},${decimalPart}`;
};

// Funnel Column Component
function FunnelColumn({ title, id, cards, onAddCard, onCardClick, color, totalValue }: any) {
    // Format currency in BRL
    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value / 100); // value is stored in cents
    };

    return (
        <div className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-xl border border-border/50 h-[calc(100vh-12rem)]">
            <div
                className="p-4 flex items-center justify-between border-b border-border/50 rounded-t-xl backdrop-blur-sm"
                style={{ backgroundColor: `${color}20` }}
            >
                <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">{title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-background/50 px-2 py-0.5 rounded-full text-muted-foreground font-mono">
                            {cards.length} {cards.length === 1 ? 'negócio' : 'negócios'}
                        </span>
                        <span className="text-xs font-semibold text-primary">
                            {formatCurrency(totalValue)}
                        </span>
                    </div>
                </div>
            </div>

            <Droppable droppableId={id.toString()}>
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-1 p-2 overflow-y-auto custom-scrollbar space-y-3"
                    >
                        {cards.map((card: any, index: number) => (
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
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-sm">{card.clientName}</h4>
                                            {card.cnpj && (
                                                <p className="text-xs text-muted-foreground">CNPJ: {card.cnpj}</p>
                                            )}
                                            {card.contactName && (
                                                <p className="text-xs text-muted-foreground">Contato: {card.contactName}</p>
                                            )}
                                            {card.phone && (
                                                <p className="text-xs text-muted-foreground">Telefone: {card.phone}</p>
                                            )}
                                            {card.proposalNumber && (
                                                <div className="flex items-center gap-1 text-xs">
                                                    <span className="font-medium">Proposta:</span>
                                                    <span className="text-primary">#{card.proposalNumber}</span>
                                                </div>
                                            )}
                                            {card.value && (
                                                <div className="flex items-center gap-1 pt-2 border-t">
                                                    <TrendingUp className="w-3 h-3 text-green-600" />
                                                    <span className="text-sm font-bold text-green-600">
                                                        {formatCurrency(card.value)}
                                                    </span>
                                                </div>
                                            )}
                                            {card.sendDate && (
                                                <p className="text-xs text-muted-foreground">
                                                    Enviado em: {card.sendDate.split('-').reverse().join('/')}
                                                </p>
                                            )}
                                            {card.createdAt && (
                                                <p className="text-xs text-muted-foreground">
                                                    Criado em: {new Date(card.createdAt).toLocaleDateString('pt-BR')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <div className="p-3 border-t border-border/50">
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => onAddCard(id)}>
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Negócio
                </Button>
            </div>
        </div>
    );
}

// Card creation schema
const cardSchema = z.object({
    clientName: z.string().min(1, "Nome do cliente é obrigatório"),
    cnpj: z.string().optional(),
    contactName: z.string().optional(),
    phone: z.string().optional(),
    proposalNumber: z.string().optional(),
    sendDate: z.string().nullable().optional(),
    value: z.string().optional(),
    notes: z.string().optional(),
    columnId: z.number(),
});

export default function SalesFunnel() {
    const { data: columns } = useSalesFunnelColumns();
    const { data: cards } = useSalesFunnelCards();
    const moveSalesFunnelCard = useMoveSalesFunnelCard();
    const createSalesFunnelCard = useCreateSalesFunnelCard();
    const updateSalesFunnelCard = useUpdateSalesFunnelCard();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
    const [selectedCard, setSelectedCard] = useState<any>(null);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const form = useForm({
        resolver: zodResolver(cardSchema),
        defaultValues: {
            clientName: "",
            cnpj: "",
            contactName: "",
            phone: "",
            proposalNumber: "",
            sendDate: null as string | null,
            value: "",
            notes: "",
            columnId: 0,
        }
    });

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const { draggableId, destination } = result;

        moveSalesFunnelCard.mutate({
            id: parseInt(draggableId),
            columnId: parseInt(destination.droppableId),
        });
    };

    const handleAddCard = (columnId: number) => {
        setSelectedColumn(columnId);
        form.setValue("columnId", columnId);
        setIsAddOpen(true);
    };

    const handleCardClick = (card: any) => {
        setSelectedCard(card);
        setIsCardModalOpen(true);
    };

    const onSubmit = (data: any) => {
        const valueInCents = data.value ? Math.round(parseFloat(data.value.replace(/[^\d,]/g, '').replace(',', '.')) * 100) : null;

        createSalesFunnelCard.mutate({
            clientName: data.clientName,
            cnpj: data.cnpj || null,
            contactName: data.contactName || null,
            phone: data.phone || null,
            proposalNumber: data.proposalNumber || null,
            sendDate: data.sendDate || null,
            value: valueInCents,
            notes: data.notes || null,
            columnId: data.columnId,
            createdBy: null,
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                form.reset();
            }
        });
    };

    if (!columns || !cards) {
        return (
            <Layout>
                <div className="animate-pulse h-96 bg-muted/20 rounded-2xl" />
            </Layout>
        );
    }

    // Filter cards based on search text
    const filterCards = (cardsList: any[]) => {
        if (!searchText.trim()) return cardsList;

        const searchLower = searchText.toLowerCase().trim();
        return cardsList.filter(card => {
            const clientName = (card.clientName || '').toLowerCase();
            const cnpj = (card.cnpj || '').toLowerCase();
            const contactName = (card.contactName || '').toLowerCase();
            const phone = (card.phone || '').toLowerCase();
            const proposalNumber = (card.proposalNumber || '').toLowerCase();
            const notes = (card.notes || '').toLowerCase();

            return clientName.includes(searchLower) ||
                cnpj.includes(searchLower) ||
                contactName.includes(searchLower) ||
                phone.includes(searchLower) ||
                proposalNumber.includes(searchLower) ||
                notes.includes(searchLower);
        });
    };

    // Group cards by column with filtering
    const getCardsForColumn = (colId: number) => {
        const columnCards = cards.filter(c => c.columnId === colId);
        return filterCards(columnCards);
    };

    // Calculate total value per column (using filtered cards)
    const getTotalValueForColumn = (colId: number) => {
        const columnCards = getCardsForColumn(colId);
        return columnCards.reduce((sum, card) => sum + (card.value || 0), 0);
    };

    // Calculate overall stats (using filtered cards)
    const filteredCards = filterCards(cards);
    const totalValue = filteredCards.reduce((sum, card) => sum + (card.value || 0), 0);
    const totalDeals = filteredCards.length;

    return (
        <Layout>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold font-display">Funil de Vendas</h1>
                        <p className="text-sm text-muted-foreground">
                            {totalDeals} {totalDeals === 1 ? 'negócio' : 'negócios'} • {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                            }).format(totalValue / 100)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <div className="relative w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Buscar por cliente, CNPJ, contato, telefone, proposta..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>

                {/* Kanban Board */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 overflow-x-auto pb-4">
                        <div className="flex gap-4 min-w-max h-full">
                            {columns.map(col => (
                                <FunnelColumn
                                    key={col.id}
                                    id={col.id}
                                    title={col.name}
                                    cards={getCardsForColumn(col.id)}
                                    onAddCard={handleAddCard}
                                    onCardClick={handleCardClick}
                                    color={col.color || "#3b82f6"}
                                    totalValue={getTotalValueForColumn(col.id)}
                                />
                            ))}
                        </div>
                    </div>
                </DragDropContext>

                {/* Add Card Modal */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Novo Negócio</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="clientName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Cliente *</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cnpj"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>CNPJ</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="00.000.000/0000-00"
                                                        maxLength={18}
                                                        onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="proposalNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número da Proposta</FormLabel>
                                                <FormControl><Input {...field} placeholder="Ex: 2024001" /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contactName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome do Contato</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Telefone</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="(00) 00000-0000"
                                                        maxLength={15}
                                                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="value"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valor da Proposta</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="R$ 0,00"
                                                        onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sendDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Data do Envio</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        value={field.value || ''}
                                                        onChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Observações</FormLabel>
                                            <FormControl><Textarea {...field} rows={3} /></FormControl>
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full">Criar Negócio</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                {/* Card Detail Modal - Editable */}
                <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-display">
                                {selectedCard?.clientName || "Editar Negócio"}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedCard && (
                            <CardEditForm
                                card={selectedCard}
                                onClose={() => setIsCardModalOpen(false)}
                                onUpdate={() => {
                                    setIsCardModalOpen(false);
                                }}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}

// Separate component for the card edit form
interface CardEditFormProps {
    card: any;
    onClose: () => void;
    onUpdate: () => void;
}

function CardEditForm({ card, onClose, onUpdate }: CardEditFormProps) {
    const updateSalesFunnelCard = useUpdateSalesFunnelCard();

    // State for editable fields
    const [editableClientName, setEditableClientName] = React.useState(card.clientName || '');
    const [editableCnpj, setEditableCnpj] = React.useState(card.cnpj || '');
    const [editableContactName, setEditableContactName] = React.useState(card.contactName || '');
    const [editablePhone, setEditablePhone] = React.useState(card.phone || '');
    const [editableProposalNumber, setEditableProposalNumber] = React.useState(card.proposalNumber || '');
    const [editableValue, setEditableValue] = React.useState(
        card.value ? formatCurrencyInput(card.value.toString()) : ''
    );
    const [editableSendDate, setEditableSendDate] = React.useState(
        card.sendDate || ''
    );
    const [editableNotes, setEditableNotes] = React.useState(card.notes || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Convert value to cents
        const valueInCents = editableValue
            ? Math.round(parseFloat(editableValue.replace(/[^\d,]/g, '').replace(',', '.')) * 100)
            : null;

        try {
            await updateSalesFunnelCard.mutateAsync({
                id: card.id,
                updates: {
                    clientName: editableClientName,
                    cnpj: editableCnpj || null,
                    contactName: editableContactName || null,
                    phone: editablePhone || null,
                    proposalNumber: editableProposalNumber || null,
                    value: valueInCents,
                    sendDate: editableSendDate || null,
                    notes: editableNotes || null,
                },
            });
            onUpdate();
        } catch (error) {
            console.error("Error updating sales funnel card:", error);
            alert("Erro ao salvar as alterações. Verifique o console.");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Nome do Cliente *
                    </label>
                    <Input
                        value={editableClientName}
                        onChange={(e) => setEditableClientName(e.target.value)}
                        placeholder="Nome do cliente"
                        required
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        CNPJ
                    </label>
                    <Input
                        value={editableCnpj}
                        onChange={(e) => setEditableCnpj(formatCNPJ(e.target.value))}
                        placeholder="00.000.000/0000-00"
                        maxLength={18}
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Número da Proposta
                    </label>
                    <Input
                        value={editableProposalNumber}
                        onChange={(e) => setEditableProposalNumber(e.target.value)}
                        placeholder="Ex: 2024001"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Nome do Contato
                    </label>
                    <Input
                        value={editableContactName}
                        onChange={(e) => setEditableContactName(e.target.value)}
                        placeholder="Nome do contato"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Telefone
                    </label>
                    <Input
                        value={editablePhone}
                        onChange={(e) => setEditablePhone(formatPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Valor da Proposta
                    </label>
                    <Input
                        value={editableValue}
                        onChange={(e) => setEditableValue(formatCurrencyInput(e.target.value))}
                        placeholder="R$ 0,00"
                    />
                </div>

                <div>
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Data do Envio
                    </label>
                    <Input
                        type="date"
                        value={editableSendDate}
                        onChange={(e) => setEditableSendDate(e.target.value)}
                    />
                </div>

                <div className="col-span-2">
                    <label className="text-sm font-semibold text-muted-foreground mb-2 block">
                        Observações
                    </label>
                    <Textarea
                        value={editableNotes}
                        onChange={(e) => setEditableNotes(e.target.value)}
                        placeholder="Observações sobre o negócio"
                        rows={3}
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                    Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={updateSalesFunnelCard.isPending}>
                    {updateSalesFunnelCard.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
            </div>
        </form>
    );
}
