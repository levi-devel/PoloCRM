import { Layout } from "@/components/layout/Layout";
import {
    useSalesFunnelColumns,
    useSalesFunnelCards,
    useCreateSalesFunnelCard,
    useMoveSalesFunnelCard,
    useUpdateSalesFunnelCard,
    useDeleteSalesFunnelCard
} from "@/hooks/use-sales-funnel";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import {
    Plus,
    TrendingUp,
    Search,
    Building2,
    User,
    Phone,
    Calendar,
    Trash2,
    Clock,
    ArrowUpRight
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

// Utility functions for input masks
const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : '';
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const formatCurrencyInput = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const numberValue = parseInt(numbers, 10);
    const formatted = (numberValue / 100).toFixed(2);
    const [integerPart, decimalPart] = formatted.split('.');
    const withThousandSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${withThousandSeparators},${decimalPart}`;
};

const formatDateForInput = (dateValue: any): string => {
    if (!dateValue) return '';
    try {
        if (typeof dateValue === 'string') {
            // If it's "YYYY-MM-DD" or starts with it, return the date part directly
            const matches = dateValue.match(/^(\d{4}-\d{2}-\d{2})/);
            if (matches) return matches[1];
            return dateValue.split('T')[0];
        }
        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '';

        // Use UTC methods for date objects to avoid local timezone shifts
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        return '';
    }
};

const safeFormatDate = (dateValue: any, formatStr: string) => {
    if (!dateValue) return '-';
    try {
        // If it's a date-only string "YYYY-MM-DD", parse components manually to avoid TZ shifts
        if (typeof dateValue === 'string') {
            const matches = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (matches && !formatStr.includes('H') && !formatStr.includes('m')) {
                const [_, y, m, d] = matches;
                const localDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                return format(localDate, formatStr, { locale: ptBR });
            }
        }

        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '-';

        // For date-only display from Date objects, use UTC parts to avoid shift
        if (!formatStr.includes('H') && !formatStr.includes('m')) {
            const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
            return format(utcDate, formatStr, { locale: ptBR });
        }

        return format(d, formatStr, { locale: ptBR });
    } catch (e) {
        return '-';
    }
};

// Funnel Column Component
function FunnelColumn({ title, id, cards, onAddCard, onCardClick, color, totalValue }: any) {
    const formatCurrency = (value: number | null | undefined) => {
        if (!value) return "R$ 0,00";
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value / 100);
    };

    return (
        <div className="w-80 flex-shrink-0 flex flex-col bg-card/40 backdrop-blur-xl border border-border/50 rounded-2xl h-[calc(100vh-16rem)] overflow-hidden shadow-sm">
            <div
                className="p-4 flex flex-col gap-2 border-b border-border/5 relative overflow-hidden"
                style={{ backgroundColor: `${color}10` }}
            >
                <div className="absolute top-0 right-0 w-16 h-16 blur-2xl opacity-10 pointer-events-none" style={{ backgroundColor: color }} />

                <div className="flex items-center justify-between z-10">
                    <h3 className="font-bold text-sm tracking-tight">{title}</h3>
                    <div className="bg-background/60 px-2 py-0.5 rounded-full border border-border/50">
                        <span className="text-[10px] font-bold text-muted-foreground">
                            {cards.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 z-10">
                    <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-sm font-bold opacity-90">
                        {formatCurrency(totalValue)}
                    </span>
                </div>
            </div>

            <Droppable droppableId={id.toString().trim()}>
                {(provided, snapshot) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3 transition-colors duration-300 min-h-[150px] ${snapshot.isDraggingOver ? "bg-accent/10" : ""
                            }`}
                    >
                        {cards.map((card: any, index: number) => (
                            <Draggable key={card.id.toString()} draggableId={card.id.toString()} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                            ...provided.draggableProps.style,
                                            userSelect: 'none'
                                        }}
                                        onClick={() => onCardClick(card)}
                                        className={`bg-card p-3.5 rounded-xl border border-border/50 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/20 transition-all ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20 !z-[9999]" : ""
                                            }`}
                                    >
                                        <div className="space-y-2.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-bold text-xs leading-tight line-clamp-2">
                                                    {card.nome_cliente}
                                                </h4>
                                                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                                            </div>

                                            <div className="space-y-1">
                                                {card.cnpj && (
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <Building2 className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{card.cnpj}</span>
                                                    </div>
                                                )}
                                                {card.nome_contato && (
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <User className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{card.nome_contato}</span>
                                                    </div>
                                                )}
                                                {card.telefone && (
                                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                                        <Phone className="w-3 h-3 flex-shrink-0" />
                                                        <span>{card.telefone}</span>
                                                    </div>
                                                )}

                                                <div className="pt-1.5 space-y-1 border-t border-border/20 mt-1">
                                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium">
                                                        <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                                                        <span>Enviado em: {safeFormatDate(card.data_envio, 'dd/MM/yyyy')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
                                                        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                                        <span>Criado em: {safeFormatDate(card.criado_em, 'dd/MM/yyyy HH:mm')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                                <span className="text-xs font-black text-green-600">
                                                    {formatCurrency(card.valor)}
                                                </span>
                                                {card.numero_proposta && (
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/5 text-primary rounded border border-primary/10">
                                                        #{card.numero_proposta}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <div className="p-3 border-t border-border/30 bg-accent/5">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs font-bold hover:bg-primary hover:text-white rounded-lg transition-all"
                    onClick={() => onAddCard(id)}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Negócio
                </Button>
            </div>
        </div>
    );
}

// Card creation schema - Adjusted to match snake_case
const cardSchema = z.object({
    nome_cliente: z.string().min(1, "Nome do cliente é obrigatório"),
    cnpj: z.string().nullable().optional(),
    nome_contato: z.string().nullable().optional(),
    telefone: z.string().nullable().optional(),
    numero_proposta: z.string().nullable().optional(),
    data_envio: z.string().nullable().optional(),
    valor: z.string().nullable().optional(),
    observacoes: z.string().nullable().optional(),
    id_coluna: z.number(),
});

export default function SalesFunnel() {
    const { data: columns } = useSalesFunnelColumns();
    const { data: cards } = useSalesFunnelCards();
    const moveSalesFunnelCard = useMoveSalesFunnelCard();
    const createSalesFunnelCard = useCreateSalesFunnelCard();
    const updateSalesFunnelCard = useUpdateSalesFunnelCard();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedCard, setSelectedCard] = useState<any>(null);
    const [isCardModalOpen, setIsCardModalOpen] = useState(false);
    const [searchText, setSearchText] = useState('');

    const form = useForm({
        resolver: zodResolver(cardSchema),
        defaultValues: {
            nome_cliente: "",
            cnpj: "",
            nome_contato: "",
            telefone: "",
            numero_proposta: "",
            data_envio: "",
            valor: "",
            observacoes: "",
            id_coluna: 0,
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
        form.reset({
            nome_cliente: "",
            cnpj: "",
            nome_contato: "",
            telefone: "",
            numero_proposta: "",
            data_envio: "",
            valor: "",
            observacoes: "",
            id_coluna: columnId,
        });
        setIsAddOpen(true);
    };

    const handleCardClick = (card: any) => {
        setSelectedCard(card);
        setIsCardModalOpen(true);
    };

    const onSubmit = (data: any) => {
        const valueInCents = data.valor ? Math.round(parseFloat(data.valor.replace(/[^\d,]/g, '').replace(',', '.')) * 100) : null;

        createSalesFunnelCard.mutate({
            id_coluna: data.id_coluna,
            nome_cliente: data.nome_cliente,
            cnpj: data.cnpj || null,
            nome_contato: data.nome_contato || null,
            telefone: data.telefone || null,
            numero_proposta: data.numero_proposta || null,
            data_envio: data.data_envio || null,
            valor: valueInCents,
            observacoes: data.observacoes || null,
            criado_por: null,
        }, {
            onSuccess: () => {
                setIsAddOpen(false);
                form.reset();
            }
        });
    };

    const filteredCardsList = useMemo(() => {
        if (!cards) return [];
        if (!searchText.trim()) return cards;

        const searchLower = searchText.toLowerCase().trim();
        return cards.filter(card => {
            return (card.nome_cliente || '').toLowerCase().includes(searchLower) ||
                (card.cnpj || '').toLowerCase().includes(searchLower) ||
                (card.nome_contato || '').toLowerCase().includes(searchLower) ||
                (card.telefone || '').toLowerCase().includes(searchLower) ||
                (card.numero_proposta || '').toLowerCase().includes(searchLower) ||
                (card.observacoes || '').toLowerCase().includes(searchLower);
        });
    }, [cards, searchText]);

    const totalValue = useMemo(() =>
        filteredCardsList.reduce((sum, card) => sum + (card.valor || 0), 0),
        [filteredCardsList]);

    if (!columns || !cards) {
        return (
            <Layout>
                <div className="h-[200px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-muted-foreground font-medium">Carregando Funil...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-card border rounded-2xl shadow-sm">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight mb-1 font-display">
                            Funil de Vendas
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-bold text-primary">{filteredCardsList.length} Negócios</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="font-bold text-green-600">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(totalValue / 100)}
                            </span>
                        </div>
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            type="text"
                            placeholder="Buscar cliente, proposta..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-10 w-full md:w-[350px] bg-accent/5"
                        />
                    </div>
                </div>

                {/* Kanban Board Container */}
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="overflow-x-auto custom-scrollbar pb-6 px-1">
                        <div className="flex gap-4 min-w-max">
                            {columns.map(col => {
                                const colCards = filteredCardsList.filter(c => c.id_coluna === col.id);
                                const colTotal = colCards.reduce((sum, c) => sum + (c.valor || 0), 0);
                                return (
                                    <FunnelColumn
                                        key={col.id}
                                        id={col.id}
                                        title={col.nome}
                                        cards={colCards}
                                        onAddCard={handleAddCard}
                                        onCardClick={handleCardClick}
                                        color={col.cor || "#3b82f6"}
                                        totalValue={colTotal}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </DragDropContext>

                {/* Add Card Modal */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">
                                Adicionar Novo Negócio
                            </DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                                <FormField
                                    control={form.control}
                                    name="nome_cliente"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Cliente *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ex: PoloTelecom Corp" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="cnpj"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">CNPJ</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value || ''}
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
                                        name="numero_proposta"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Nº Proposta</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} placeholder="Ex: 2024001" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="nome_contato"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Contato</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} placeholder="Nome da pessoa" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="telefone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Telefone</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value || ''}
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
                                        name="valor"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Valor Estimado</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        value={field.value || ''}
                                                        placeholder="R$ 0,00"
                                                        className="font-bold text-green-600"
                                                        onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="data_envio"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Data</FormLabel>
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
                                    name="observacoes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Observações</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} value={field.value || ''} rows={3} className="resize-none" />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    className="w-full font-bold shadow-lg"
                                    disabled={createSalesFunnelCard.isPending}
                                >
                                    {createSalesFunnelCard.isPending ? "Processando..." : "Criar Negócio"}
                                </Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>

                {/* Card Detail Modal - Editable */}
                <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <DialogHeader className="border-b pb-4 mb-4">
                            <DialogTitle className="text-2xl font-black font-display text-primary">
                                {selectedCard?.nome_cliente || "Detalhes do Negócio"}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedCard && (
                            <CardEditForm
                                card={selectedCard}
                                onClose={() => setIsCardModalOpen(false)}
                                onUpdate={() => setIsCardModalOpen(false)}
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
    const deleteSalesFunnelCard = useDeleteSalesFunnelCard();
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Use react-hook-form for better validation and type handling
    const editForm = useForm({
        defaultValues: {
            nome_cliente: card.nome_cliente || '',
            cnpj: card.cnpj || '',
            nome_contato: card.nome_contato || '',
            telefone: card.telefone || '',
            numero_proposta: card.numero_proposta || '',
            valor: card.valor ? formatCurrencyInput(card.valor.toString()) : '',
            data_envio: formatDateForInput(card.data_envio),
            observacoes: card.observacoes || '',
        }
    });

    const onEditSubmit = async (data: any) => {
        const valueInCents = data.valor
            ? Math.round(parseFloat(data.valor.replace(/[^\d,]/g, '').replace(',', '.')) * 100)
            : null;

        try {
            await updateSalesFunnelCard.mutateAsync({
                id: card.id,
                updates: {
                    nome_cliente: data.nome_cliente,
                    cnpj: data.cnpj || null,
                    nome_contato: data.nome_contato || null,
                    telefone: data.telefone || null,
                    numero_proposta: data.numero_proposta || null,
                    valor: valueInCents,
                    data_envio: data.data_envio || null,
                    observacoes: data.observacoes || null,
                },
            });
            onUpdate();
        } catch (error) {
            console.error("Error updating card:", error);
            alert("Erro ao salvar as alterações.");
        }
    };

    const handleDelete = async () => {
        try {
            await deleteSalesFunnelCard.mutateAsync(card.id);
            onUpdate();
        } catch (error) {
            console.error("Error deleting card:", error);
            alert("Erro ao excluir negócio.");
        }
    };

    return (
        <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={editForm.control}
                        name="nome_cliente"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cliente *</FormLabel>
                                <FormControl><Input {...field} required /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="cnpj"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">CNPJ</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        maxLength={18}
                                        onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="numero_proposta"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Proposta</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="nome_contato"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Contato</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="telefone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Telefone</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        maxLength={15}
                                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="valor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Valor</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        className="font-bold text-green-600"
                                        onChange={(e) => field.onChange(formatCurrencyInput(e.target.value))}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="data_envio"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Data de Envio</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="observacoes"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Observações</FormLabel>
                                <FormControl><Textarea {...field} rows={4} className="resize-none" /></FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-6 mt-4 border-t">
                    <AnimatePresence mode="wait">
                        {!confirmDelete ? (
                            <motion.button
                                key="delete-btn"
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Excluir
                            </motion.button>
                        ) : (
                            <motion.div
                                key="confirm-delete"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2"
                            >
                                <span className="text-[10px] font-bold text-red-500 uppercase">Confirmar?</span>
                                <Button type="button" variant="destructive" size="sm" onClick={handleDelete}>Sim</Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Não</Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex-1" />

                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={onClose} className="font-bold">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="font-bold px-8 shadow-sm"
                            disabled={updateSalesFunnelCard.isPending}
                        >
                            {updateSalesFunnelCard.isPending ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
