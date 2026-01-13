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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Utility function to calculate days since card creation
const getDaysSinceCreation = (createdDate: any): number => {
    if (!createdDate) return 0;
    try {
        const created = new Date(createdDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - created.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    } catch (e) {
        return 0;
    }
};

// Utility function to get border color based on negotiation time
const getNegotiationBorderColor = (card: any, columnName: string): string | null => {
    // Only apply colors to cards in "Negociação" column
    if (columnName !== "Negociação") return null;

    const days = getDaysSinceCreation(card.criado_em);

    if (days >= 30) {
        return "#ef4444"; // Red
    } else if (days >= 20) {
        return "#fb923c"; // Orange
    } else if (days >= 10) {
        return "#fef08a"; // Yellow
    }

    return null; // No border color for less than 10 days
};

// Card Content Component (reutilizado para card normal e clone durante drag)
const CardContent = ({ card, formatCurrency, isDragging = false, columnName = "" }: any) => {
    const borderColor = getNegotiationBorderColor(card, columnName);

    return (
        <div
            className="space-y-2.5"
            style={borderColor ? { borderLeft: `4px solid ${borderColor}`, paddingLeft: "8px" } : {}}
        >
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-xs leading-tight line-clamp-2">
                    {card.razao_social}
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
                {card.contato_responsavel && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <User className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{card.contato_responsavel}</span>
                    </div>
                )}
                {card.telefone_responsavel && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span>{card.telefone_responsavel}</span>
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
    );
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

    // Função de renderização do clone durante o drag
    const renderClone = (provided: any, snapshot: any, rubric: any) => {
        const card = cards[rubric.source.index];
        return (
            <div
                {...provided.draggableProps}
                {...provided.dragHandleProps}
                ref={provided.innerRef}
                className="bg-card p-3.5 rounded-xl border-2 border-primary shadow-2xl ring-4 ring-primary/30 w-80 cursor-grabbing"
            >
                <CardContent card={card} formatCurrency={formatCurrency} isDragging={true} columnName={title} />
            </div>
        );
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

            <Droppable droppableId={id.toString().trim()} renderClone={renderClone}>
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
                                            userSelect: 'none',
                                        }}
                                        onClick={() => !snapshot.isDragging && onCardClick(card)}
                                        className={`bg-card p-3.5 rounded-xl border border-border/50 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/20 transition-all ${snapshot.isDragging ? "opacity-30" : ""
                                            }`}
                                    >
                                        <CardContent card={card} formatCurrency={formatCurrency} isDragging={snapshot.isDragging} columnName={title} />
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
    razao_social: z.string().min(1, "Razão Social é obrigatória"),
    cnpj: z.string().nullable().optional(),
    nome_fantasia: z.string().nullable().optional(),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    contato_responsavel: z.string().nullable().optional(),
    telefone_responsavel: z.string().nullable().optional(),
    email_responsavel: z.string().nullable().optional(),
    contato_financeiro: z.string().nullable().optional(),
    telefone_financeiro: z.string().nullable().optional(),
    email_financeiro: z.string().nullable().optional(),
    numero_proposta: z.string().nullable().optional(),
    data_envio: z.string().nullable().optional(),
    valor: z.string().nullable().optional(),
    observacoes: z.string().nullable().optional(),
    produto: z.string().nullable().optional(),
    produto_especifico: z.string().nullable().optional(),
    quantidade_produto: z.string().nullable().optional(),
    tipo_contrato: z.string().nullable().optional(),
    data_assinatura_contrato: z.string().nullable().optional(),
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
    const [isConsultingCNPJ, setIsConsultingCNPJ] = useState(false);

    const form = useForm({
        resolver: zodResolver(cardSchema),
        defaultValues: {
            razao_social: "",
            cnpj: "",
            nome_fantasia: "",
            endereco: "",
            numero: "",
            bairro: "",
            cidade: "",
            cep: "",
            contato_responsavel: "",
            telefone_responsavel: "",
            email_responsavel: "",
            contato_financeiro: "",
            telefone_financeiro: "",
            email_financeiro: "",
            numero_proposta: "",
            data_envio: "",
            valor: "",
            observacoes: "",
            produto: "",
            produto_especifico: "",
            quantidade_produto: "",
            tipo_contrato: "",
            data_assinatura_contrato: "",
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
            razao_social: "",
            cnpj: "",
            nome_fantasia: "",
            endereco: "",
            numero: "",
            bairro: "",
            cidade: "",
            cep: "",
            contato_responsavel: "",
            telefone_responsavel: "",
            email_responsavel: "",
            contato_financeiro: "",
            telefone_financeiro: "",
            email_financeiro: "",
            numero_proposta: "",
            data_envio: "",
            valor: "",
            observacoes: "",
            produto: "",
            produto_especifico: "",
            quantidade_produto: "",
            tipo_contrato: "",
            data_assinatura_contrato: "",
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
        const quantidadeInt = data.quantidade_produto ? parseInt(data.quantidade_produto) : null;

        createSalesFunnelCard.mutate({
            id_coluna: data.id_coluna,
            razao_social: data.razao_social,
            cnpj: data.cnpj || null,
            nome_fantasia: data.nome_fantasia || null,
            endereco: data.endereco || null,
            numero: data.numero || null,
            bairro: data.bairro || null,
            cidade: data.cidade || null,
            cep: data.cep || null,
            contato_responsavel: data.contato_responsavel || null,
            telefone_responsavel: data.telefone_responsavel || null,
            email_responsavel: data.email_responsavel || null,
            contato_financeiro: data.contato_financeiro || null,
            telefone_financeiro: data.telefone_financeiro || null,
            email_financeiro: data.email_financeiro || null,
            numero_proposta: data.numero_proposta || null,
            data_envio: data.data_envio || null,
            valor: valueInCents,
            observacoes: data.observacoes || null,
            produto: data.produto || null,
            produto_especifico: data.produto_especifico || null,
            quantidade_produto: quantidadeInt,
            tipo_contrato: data.tipo_contrato || null,
            data_assinatura_contrato: data.data_assinatura_contrato || null,
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
            return (card.razao_social || '').toLowerCase().includes(searchLower) ||
                (card.cnpj || '').toLowerCase().includes(searchLower) ||
                (card.nome_fantasia || '').toLowerCase().includes(searchLower) ||
                (card.cidade || '').toLowerCase().includes(searchLower) ||
                (card.contato_responsavel || '').toLowerCase().includes(searchLower) ||
                (card.telefone_responsavel || '').toLowerCase().includes(searchLower) ||
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
                    <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
                        <DialogHeader className="flex-shrink-0">
                            <DialogTitle className="text-xl font-bold">
                                Adicionar Novo Negócio
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                                    {/* CNPJ com botão Consultar */}
                                    <div className="flex gap-2 items-end">
                                        <FormField
                                            control={form.control}
                                            name="cnpj"
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
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
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="mb-0.5"
                                            disabled={isConsultingCNPJ}
                                            onClick={async () => {
                                                const cnpj = form.getValues('cnpj');
                                                if (!cnpj || cnpj.length < 14) {
                                                    alert('Digite um CNPJ válido');
                                                    return;
                                                }
                                                setIsConsultingCNPJ(true);
                                                try {
                                                    const response = await fetch(`https://api.opencnpj.org/${cnpj}`);
                                                    if (!response.ok) throw new Error('CNPJ não encontrado');
                                                    const data = await response.json();
                                                    form.setValue('razao_social', data.razao_social || '');
                                                    form.setValue('nome_fantasia', data.nome_fantasia || '');
                                                    form.setValue('endereco', data.logradouro || '');
                                                    form.setValue('bairro', data.bairro || '');
                                                    form.setValue('cidade', data.municipio || '');
                                                    form.setValue('cep', data.cep || '');
                                                } catch (error) {
                                                    alert('Erro ao consultar CNPJ. Verifique se o CNPJ está correto.');
                                                } finally {
                                                    setIsConsultingCNPJ(false);
                                                }
                                            }}
                                        >
                                            {isConsultingCNPJ ? (
                                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            ) : (
                                                <Search className="w-4 h-4 mr-1" />
                                            )}
                                            {isConsultingCNPJ ? 'Consultando...' : 'Consultar'}
                                        </Button>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="razao_social"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Razão Social *</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Ex: PoloTelecom Ltda" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="nome_fantasia"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Nome Fantasia</FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value || ''} placeholder="Nome comercial" />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    {/* Campos de Endereço */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="endereco"
                                            render={({ field }) => (
                                                <FormItem className="col-span-2">
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Endereço</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="Rua, Avenida..." />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="numero"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Nº</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="123" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="bairro"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Bairro</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="Bairro" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="cidade"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Cidade</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="Cidade" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="cep"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">CEP</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="00000-000" maxLength={9} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
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

                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="contato_responsavel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Contato Responsável</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="Nome da pessoa" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="telefone_responsavel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Telefone Responsável</FormLabel>
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
                                        <FormField
                                            control={form.control}
                                            name="email_responsavel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Email Responsável</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} type="email" placeholder="email@exemplo.com" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Contato Financeiro */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="contato_financeiro"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Contato Financeiro</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} placeholder="Nome do responsável" />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="telefone_financeiro"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Telefone Financeiro</FormLabel>
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
                                        <FormField
                                            control={form.control}
                                            name="email_financeiro"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Email Financeiro</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} value={field.value || ''} type="email" placeholder="financeiro@exemplo.com" />
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

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="produto"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Produto</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione o produto" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="IPPolo Omni Business">IPPolo Omni Business</SelectItem>
                                                            <SelectItem value="IPPolo Omni Enterprise">IPPolo Omni Enterprise</SelectItem>
                                                            <SelectItem value="IPPolo Omni Profissional">IPPolo Omni Profissional</SelectItem>
                                                            <SelectItem value="Plataforma 360 OMNI">Plataforma 360 OMNI</SelectItem>
                                                            <SelectItem value="Pabx 3CX">Pabx 3CX</SelectItem>
                                                            <SelectItem value="PABX HIBRIDO">PABX HIBRIDO</SelectItem>
                                                            <SelectItem value="Pabx IPPolo Business">Pabx IPPolo Business</SelectItem>
                                                            <SelectItem value="Pabx IPPolo Cloud">Pabx IPPolo Cloud</SelectItem>
                                                            <SelectItem value="Pabx IPPolo Enterprise">Pabx IPPolo Enterprise</SelectItem>
                                                            <SelectItem value="Pabx IPPolo Profissional">Pabx IPPolo Profissional</SelectItem>
                                                            <SelectItem value="Desenvolvimento de Sistema">Desenvolvimento de Sistema</SelectItem>
                                                            <SelectItem value="Desenvolvimento de Agente IA">Desenvolvimento de Agente IA</SelectItem>
                                                            <SelectItem value="Desenvolvimento de API">Desenvolvimento de API</SelectItem>
                                                            <SelectItem value="Setup de desenvolvimento">Setup de desenvolvimento</SelectItem>
                                                            <SelectItem value="Produtos">Produtos</SelectItem>
                                                            <SelectItem value="Linha Voip">Linha Voip</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="produto_especifico"
                                            render={({ field }) => {
                                                const produtoSelecionado = form.watch("produto");
                                                if (produtoSelecionado !== "Produtos") return <></>;

                                                return (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Produto Específico</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione o produto" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Gateway GSM">Gateway GSM</SelectItem>
                                                                <SelectItem value="Gateway FXS">Gateway FXS</SelectItem>
                                                                <SelectItem value="Gateway FXO">Gateway FXO</SelectItem>
                                                                <SelectItem value="Gateway E1">Gateway E1</SelectItem>
                                                                <SelectItem value="Aparelho IP">Aparelho IP</SelectItem>
                                                                <SelectItem value="Headset">Headset</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                );
                                            }}
                                        />
                                    </div>

                                    {/* Quantidade - Shows when produto is "Produtos" */}
                                    {form.watch("produto") === "Produtos" && (
                                        <FormField
                                            control={form.control}
                                            name="quantidade_produto"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Quantidade</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            value={field.value || ''}
                                                            type="number"
                                                            min="1"
                                                            placeholder="Ex: 10"
                                                            className="font-semibold"
                                                        />
                                                    </FormControl>
                                                    <p className="text-xs text-muted-foreground">Quantidade de produtos ofertados</p>
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="tipo_contrato"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Tipo de Contrato</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Selecione o tipo" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Novo">Novo</SelectItem>
                                                            <SelectItem value="UPSELL">UPSELL</SelectItem>
                                                            <SelectItem value="CROSSELL">CROSSELL</SelectItem>
                                                            <SelectItem value="Aditivo">Aditivo</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="data_assinatura_contrato"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Data da Assinatura do Contrato</FormLabel>
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
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Card Detail Modal - Editable */}
                <Dialog open={isCardModalOpen} onOpenChange={setIsCardModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <DialogHeader className="border-b pb-4 mb-4">
                            <DialogTitle className="text-2xl font-black font-display text-primary">
                                {selectedCard?.razao_social || "Detalhes do Negócio"}
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
    const [isConsultingCNPJ, setIsConsultingCNPJ] = useState(false);

    // Use react-hook-form for better validation and type handling
    const editForm = useForm({
        defaultValues: {
            razao_social: card.razao_social || '',
            cnpj: card.cnpj || '',
            nome_fantasia: card.nome_fantasia || '',
            endereco: card.endereco || '',
            numero: card.numero || '',
            bairro: card.bairro || '',
            cidade: card.cidade || '',
            cep: card.cep || '',
            contato_responsavel: card.contato_responsavel || '',
            telefone_responsavel: card.telefone_responsavel || '',
            email_responsavel: card.email_responsavel || '',
            contato_financeiro: card.contato_financeiro || '',
            telefone_financeiro: card.telefone_financeiro || '',
            email_financeiro: card.email_financeiro || '',
            numero_proposta: card.numero_proposta || '',
            valor: card.valor ? formatCurrencyInput(card.valor.toString()) : '',
            data_envio: formatDateForInput(card.data_envio),
            observacoes: card.observacoes || '',
            produto: card.produto || '',
            produto_especifico: card.produto_especifico || '',
            quantidade_produto: card.quantidade_produto?.toString() || '',
            tipo_contrato: card.tipo_contrato || '',
            data_assinatura_contrato: formatDateForInput(card.data_assinatura_contrato),
        }
    });

    const onEditSubmit = async (data: any) => {
        const valueInCents = data.valor
            ? Math.round(parseFloat(data.valor.replace(/[^\d,]/g, '').replace(',', '.')) * 100)
            : null;
        const quantidadeInt = data.quantidade_produto ? parseInt(data.quantidade_produto) : null;

        try {
            await updateSalesFunnelCard.mutateAsync({
                id: card.id,
                updates: {
                    razao_social: data.razao_social,
                    cnpj: data.cnpj || null,
                    nome_fantasia: data.nome_fantasia || null,
                    endereco: data.endereco || null,
                    numero: data.numero || null,
                    bairro: data.bairro || null,
                    cidade: data.cidade || null,
                    cep: data.cep || null,
                    contato_responsavel: data.contato_responsavel || null,
                    telefone_responsavel: data.telefone_responsavel || null,
                    email_responsavel: data.email_responsavel || null,
                    contato_financeiro: data.contato_financeiro || null,
                    telefone_financeiro: data.telefone_financeiro || null,
                    email_financeiro: data.email_financeiro || null,
                    numero_proposta: data.numero_proposta || null,
                    valor: valueInCents,
                    data_envio: data.data_envio || null,
                    observacoes: data.observacoes || null,
                    produto: data.produto || null,
                    produto_especifico: data.produto_especifico || null,
                    quantidade_produto: quantidadeInt,
                    tipo_contrato: data.tipo_contrato || null,
                    data_assinatura_contrato: data.data_assinatura_contrato || null,
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
                    {/* CNPJ com botão Consultar */}
                    <div className="md:col-span-2 flex gap-2 items-end">
                        <FormField
                            control={editForm.control}
                            name="cnpj"
                            render={({ field }) => (
                                <FormItem className="flex-1">
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
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mb-0.5"
                            disabled={isConsultingCNPJ}
                            onClick={async () => {
                                const cnpj = editForm.getValues('cnpj');
                                if (!cnpj || cnpj.length < 14) {
                                    alert('Digite um CNPJ válido');
                                    return;
                                }
                                setIsConsultingCNPJ(true);
                                try {
                                    const response = await fetch(`https://api.opencnpj.org/${cnpj}`);
                                    if (!response.ok) throw new Error('CNPJ não encontrado');
                                    const data = await response.json();
                                    editForm.setValue('razao_social', data.razao_social || '');
                                    editForm.setValue('nome_fantasia', data.nome_fantasia || '');
                                    editForm.setValue('endereco', data.logradouro || '');
                                    editForm.setValue('bairro', data.bairro || '');
                                    editForm.setValue('cidade', data.municipio || '');
                                    editForm.setValue('cep', data.cep || '');
                                } catch (error) {
                                    alert('Erro ao consultar CNPJ. Verifique se o CNPJ está correto.');
                                } finally {
                                    setIsConsultingCNPJ(false);
                                }
                            }}
                        >
                            {isConsultingCNPJ ? (
                                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            ) : (
                                <Search className="w-4 h-4 mr-1" />
                            )}
                            {isConsultingCNPJ ? 'Consultando...' : 'Consultar'}
                        </Button>
                    </div>

                    <FormField
                        control={editForm.control}
                        name="razao_social"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Razão Social *</FormLabel>
                                <FormControl><Input {...field} required /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="nome_fantasia"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Nome Fantasia</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    {/* Campos de Endereço */}
                    <FormField
                        control={editForm.control}
                        name="endereco"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Endereço</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="numero"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Nº</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="bairro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Bairro</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="cidade"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Cidade</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="cep"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">CEP</FormLabel>
                                <FormControl><Input {...field} maxLength={9} /></FormControl>
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
                        name="contato_responsavel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Contato Responsável</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="telefone_responsavel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Telefone Responsável</FormLabel>
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
                        name="email_responsavel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Email Responsável</FormLabel>
                                <FormControl><Input {...field} type="email" /></FormControl>
                            </FormItem>
                        )}
                    />

                    <div className="md:col-span-2 border-t pt-2 mt-2">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Financeiro</span>
                    </div>

                    <FormField
                        control={editForm.control}
                        name="contato_financeiro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Contato Financeiro</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="telefone_financeiro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Telefone Financeiro</FormLabel>
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
                        name="email_financeiro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Email Financeiro</FormLabel>
                                <FormControl><Input {...field} type="email" /></FormControl>
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
                        name="produto"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Produto</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o produto" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="IPPolo Omni Business">IPPolo Omni Business</SelectItem>
                                        <SelectItem value="IPPolo Omni Enterprise">IPPolo Omni Enterprise</SelectItem>
                                        <SelectItem value="IPPolo Omni Profissional">IPPolo Omni Profissional</SelectItem>
                                        <SelectItem value="Plataforma 360 OMNI">Plataforma 360 OMNI</SelectItem>
                                        <SelectItem value="Pabx 3CX">Pabx 3CX</SelectItem>
                                        <SelectItem value="PABX HIBRIDO">PABX HIBRIDO</SelectItem>
                                        <SelectItem value="Pabx IPPolo Business">Pabx IPPolo Business</SelectItem>
                                        <SelectItem value="Pabx IPPolo Cloud">Pabx IPPolo Cloud</SelectItem>
                                        <SelectItem value="Pabx IPPolo Enterprise">Pabx IPPolo Enterprise</SelectItem>
                                        <SelectItem value="Pabx IPPolo Profissional">Pabx IPPolo Profissional</SelectItem>
                                        <SelectItem value="Desenvolvimento de Sistema">Desenvolvimento de Sistema</SelectItem>
                                        <SelectItem value="Desenvolvimento de Agente IA">Desenvolvimento de Agente IA</SelectItem>
                                        <SelectItem value="Desenvolvimento de API">Desenvolvimento de API</SelectItem>
                                        <SelectItem value="Setup de desenvolvimento">Setup de desenvolvimento</SelectItem>
                                        <SelectItem value="Produtos">Produtos</SelectItem>
                                        <SelectItem value="Linha Voip">Linha Voip</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="produto_especifico"
                        render={({ field }) => {
                            const produtoSelecionado = editForm.watch("produto");
                            if (produtoSelecionado !== "Produtos") return <></>;

                            return (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Produto Específico</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o produto" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Gateway GSM">Gateway GSM</SelectItem>
                                            <SelectItem value="Gateway FXS">Gateway FXS</SelectItem>
                                            <SelectItem value="Gateway FXO">Gateway FXO</SelectItem>
                                            <SelectItem value="Gateway E1">Gateway E1</SelectItem>
                                            <SelectItem value="Aparelho IP">Aparelho IP</SelectItem>
                                            <SelectItem value="Headset">Headset</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            );
                        }}
                    />

                    {/* Quantidade - Shows when produto is "Produtos" */}
                    {editForm.watch("produto") === "Produtos" && (
                        <FormField
                            control={editForm.control}
                            name="quantidade_produto"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Quantidade</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            type="number"
                                            min="1"
                                            placeholder="Ex: 10"
                                            className="font-semibold"
                                        />
                                    </FormControl>
                                    <p className="text-xs text-muted-foreground">Quantidade de produtos ofertados</p>
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField
                        control={editForm.control}
                        name="tipo_contrato"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Tipo de Contrato</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="Novo">Novo</SelectItem>
                                        <SelectItem value="UPSELL">UPSELL</SelectItem>
                                        <SelectItem value="CROSSELL">CROSSELL</SelectItem>
                                        <SelectItem value="Aditivo">Aditivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={editForm.control}
                        name="data_assinatura_contrato"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">Data da Assinatura do Contrato</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
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
