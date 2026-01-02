import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Plus, History } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { dateToInputValue, inputValueToDate } from "@/lib/date-utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function PoloProjectGantt() {
    const [, params] = useRoute("/polo-project/:id");
    const projectId = params?.id ? Number(params.id) : null;
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        startDate: null as Date | null,
        endDate: null as Date | null,
        level: 1,
        parentStageId: null as number | null,
        isCompleted: false,
        assignedTechId: "",
        activityDescription: "",
    });

    // Pause modal state
    const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
    const [pauseFormData, setPauseFormData] = useState({
        motivo: "",
        data_pausa: "",
        data_retomada: "",
    });

    // Query para buscar usuários
    const { data: users } = useQuery({
        queryKey: ["/api/users"],
        queryFn: async () => {
            const response = await fetch("/api/users");
            if (!response.ok) throw new Error("Failed to fetch users");
            return response.json();
        },
    });

    const { data: ganttData, isLoading } = useQuery({
        queryKey: [`/api/polo-projetos/${projectId}/gantt`],
        queryFn: async () => {
            if (!projectId) throw new Error("Invalid project ID");
            const response = await fetch(`/api/polo-projetos/${projectId}/gantt`);
            if (!response.ok) throw new Error("Failed to fetch Gantt data");
            return response.json();
        },
        enabled: !!projectId,
    });

    // Query para buscar pausas
    const { data: pausas = [] } = useQuery({
        queryKey: [`/api/polo-projetos/${projectId}/pausas`],
        queryFn: async () => {
            if (!projectId) throw new Error("Invalid project ID");
            const response = await fetch(`/api/polo-projetos/${projectId}/pausas`);
            if (!response.ok) throw new Error("Failed to fetch pauses");
            return response.json();
        },
        enabled: !!projectId,
    });

    // Mutation for creating a new stage
    const createStageMutation = useMutation({
        mutationFn: async (stageData: typeof formData) => {
            const response = await fetch(`/api/polo-projetos/${projectId}/stages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: stageData.name,
                    descricao: stageData.description,
                    data_inicio: dateToInputValue(stageData.startDate),
                    data_fim: dateToInputValue(stageData.endDate),
                    nivel: stageData.level,
                    id_etapa_pai: stageData.parentStageId,
                    concluida: stageData.isCompleted,
                    id_tecnico_atribuido: stageData.assignedTechId || null,
                    descricao_atividade: stageData.activityDescription,
                    ordem: 0, // Will be managed by backend
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erro ao criar etapa");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/polo-projetos/${projectId}/gantt`] });
            setIsModalOpen(false);
            setFormData({
                name: "",
                description: "",
                startDate: null,
                endDate: null,
                level: 1,
                parentStageId: null,
                isCompleted: false,
                assignedTechId: "",
                activityDescription: "",
            });
            toast({
                title: "Etapa criada",
                description: "A etapa foi adicionada ao gráfico de Gantt com sucesso.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation for updating a stage
    const updateStageMutation = useMutation({
        mutationFn: async (stageData: typeof formData & { id: number }) => {
            const response = await fetch(`/api/polo-projetos/${projectId}/stages/${stageData.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nome: stageData.name,
                    descricao: stageData.description,
                    data_inicio: dateToInputValue(stageData.startDate),
                    data_fim: dateToInputValue(stageData.endDate),
                    nivel: stageData.level,
                    id_etapa_pai: stageData.parentStageId,
                    concluida: stageData.isCompleted,
                    id_tecnico_atribuido: stageData.assignedTechId || null,
                    descricao_atividade: stageData.activityDescription,
                    ordem: 0, // Will be managed by backend
                }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erro ao atualizar etapa");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/polo-projetos/${projectId}/gantt`] });
            setIsModalOpen(false);
            setIsEditMode(false);
            setSelectedStageId(null);
            setFormData({
                name: "",
                description: "",
                startDate: null,
                endDate: null,
                level: 1,
                parentStageId: null,
                isCompleted: false,
                assignedTechId: "",
                activityDescription: "",
            });
            toast({
                title: "Etapa atualizada",
                description: "A etapa foi atualizada com sucesso.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutation for deleting a stage
    const deleteStageMutation = useMutation({
        mutationFn: async (stageId: number) => {
            const response = await fetch(`/api/polo-projetos/${projectId}/stages/${stageId}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erro ao excluir etapa");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/polo-projetos/${projectId}/gantt`] });
            setIsModalOpen(false);
            setIsEditMode(false);
            setSelectedStageId(null);
            setFormData({
                name: "",
                description: "",
                startDate: null,
                endDate: null,
                level: 1,
                parentStageId: null,
                isCompleted: false,
                assignedTechId: "",
                activityDescription: "",
            });
            toast({
                title: "Etapa excluída",
                description: "A etapa foi removida com sucesso.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Mutations for pauses
    const createPauseMutation = useMutation({
        mutationFn: async (pauseData: { motivo: string; data_pausa: string }) => {
            const response = await fetch(`/api/polo-projetos/${projectId}/pausas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(pauseData),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erro ao criar pausa");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/polo-projetos/${projectId}/pausas`] });
            toast({
                title: "Pausa registrada",
                description: "O motivo de pausa foi registrado com sucesso.",
            });
            setPauseFormData({ motivo: "", data_pausa: "", data_retomada: "" });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const updatePauseMutation = useMutation({
        mutationFn: async ({ id, data_retomada }: { id: number; data_retomada: string }) => {
            const response = await fetch(`/api/pausas/${id}/retomar`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data_retomada }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erro ao marcar retomada");
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/polo-projetos/${projectId}/pausas`] });
            toast({
                title: "Retomada registrada",
                description: "O projeto foi marcado como retomado.",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Helper function to format date string without timezone conversion
    const formatDateWithoutTimezone = (dateString: string): string => {
        if (!dateString) return '';
        // dateString is in format "YYYY-MM-DD"
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Ensure dates are valid before sending
        if (!formData.name || !formData.startDate || isNaN(formData.startDate.getTime()) || !formData.endDate || isNaN(formData.endDate.getTime())) {
            toast({
                title: "Dados inválidos",
                description: "Por favor, preencha todos os campos obrigatórios com datas válidas.",
                variant: "destructive",
            });
            return;
        }

        // Validar que sub-etapas tenham parentStageId
        if (formData.level === 2 && !formData.parentStageId) {
            toast({
                title: "Etapa Principal Obrigatória",
                description: "Sub-etapas (2º nível) devem estar vinculadas a uma etapa principal.",
                variant: "destructive",
            });
            return;
        }

        if (isEditMode && selectedStageId) {
            updateStageMutation.mutate({ ...formData, id: selectedStageId });
        } else {
            createStageMutation.mutate(formData);
        }
    };

    const handleEdit = (stage: any) => {
        setIsEditMode(true);
        setSelectedStageId(stage.id);

        // Safely parse dates
        const parseDate = (dateStr: string | null) => {
            if (!dateStr) return null;
            // First check if it's already a Date object
            if (dateStr instanceof Date) return dateStr as Date;

            // Try parsing with T00:00:00 for correct day
            const d = new Date(dateStr + 'T00:00:00');
            if (!isNaN(d.getTime())) return d;

            // Fallback for other formats
            const d2 = new Date(dateStr);
            if (!isNaN(d2.getTime())) return d2;

            return null;
        };

        setFormData({
            name: stage.nome,
            description: stage.descricao || "",
            startDate: inputValueToDate(dateToInputValue(stage.data_inicio)),
            endDate: inputValueToDate(dateToInputValue(stage.data_fim)),
            level: stage.nivel || 1,
            parentStageId: stage.id_etapa_pai || null,
            isCompleted: stage.concluida,
            assignedTechId: stage.id_tecnico_atribuido || "",
            activityDescription: stage.descricao_atividade || "",
        });
        setIsModalOpen(true);
    };

    const handleDelete = () => {
        if (selectedStageId && confirm("Tem certeza que deseja excluir esta etapa?")) {
            deleteStageMutation.mutate(selectedStageId);
        }
    };

    const handleNewStage = () => {
        setIsEditMode(false);
        setSelectedStageId(null);
        setFormData({
            name: "",
            description: "",
            startDate: null,
            endDate: null,
            level: 1,
            parentStageId: null,
            isCompleted: false,
            assignedTechId: "",
            activityDescription: "",
        });
        setIsModalOpen(true);
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-pulse text-gray-600">Carregando...</div>
                </div>
            </Layout>
        );
    }

    if (!ganttData) {
        return (
            <Layout>
                <div className="p-8">
                    <div className="text-center">
                        <p className="text-gray-600">Projeto não encontrado</p>
                        <Link href="/polo-project">
                            <Button variant="outline" className="mt-4">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                </div>
            </Layout>
        );
    }

    const { project, stages, timelineStart, timelineEnd } = ganttData;

    // Helper function to convert date string to local date (YYYY-MM-DD format)
    const toLocalDateString = (dateValue: any): string => {
        if (!dateValue) return '';

        // If it's already a Date object from our form
        if (dateValue instanceof Date) {
            const year = dateValue.getFullYear();
            const month = String(dateValue.getMonth() + 1).padStart(2, '0');
            const day = String(dateValue.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // If it's an ISO string WITH time, extract just the date part
        if (typeof dateValue === 'string' && dateValue.includes('T')) {
            return dateValue.split('T')[0];
        }

        // If it's already in YYYY-MM-DD format (from database)
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }

        // Fallback: parse and format
        // Append T00:00:00 to force local timezone interpretation
        const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toString();
        const date = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Calculate timeline with days using local dates
    const startDateStr = toLocalDateString(timelineStart);
    const endDateStr = toLocalDateString(timelineEnd);

    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);

    // Generate all days in the timeline
    const days: Date[] = [];
    let currentDay = new Date(startDate);
    while (currentDay <= endDate) {
        days.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
    }

    // Group days by month for header
    const monthGroups: { month: string; days: Date[] }[] = [];
    days.forEach(day => {
        const monthKey = day.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        const existingGroup = monthGroups.find(g => g.month === monthKey);
        if (existingGroup) {
            existingGroup.days.push(day);
        } else {
            monthGroups.push({ month: monthKey, days: [day] });
        }
    });

    // Helper function to calculate position and width for stages
    const getStagePosition = (stage: any) => {
        // Convert stage dates to local date strings for comparison
        // Use data_inicio/data_fim which are the actual field names from the API
        const stageStartStr = toLocalDateString(stage.data_inicio);
        const stageEndStr = toLocalDateString(stage.data_fim);

        // Handle null/undefined dates
        if (!stageStartStr || !stageEndStr) {
            return { left: '0%', width: '1%' };
        }

        const [sStartYear, sStartMonth, sStartDay] = stageStartStr.split('-').map(Number);
        const [sEndYear, sEndMonth, sEndDay] = stageEndStr.split('-').map(Number);

        const stageStart = new Date(sStartYear, sStartMonth - 1, sStartDay);
        const stageEnd = new Date(sEndYear, sEndMonth - 1, sEndDay);

        const totalDays = days.length;

        // Find the index of the start and end days
        const stageStartDays = days.findIndex(d => {
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return dStr === stageStartStr;
        });

        const stageEndDays = days.findIndex(d => {
            const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return dStr === stageEndStr;
        });

        // If exact match not found, fall back to range search
        const startIndex = stageStartDays >= 0 ? stageStartDays : days.findIndex(d => d >= stageStart);
        const endIndex = stageEndDays >= 0 ? stageEndDays : days.findIndex(d => d >= stageEnd);

        const left = (startIndex / totalDays) * 100;
        const width = ((endIndex - startIndex + 1) / totalDays) * 100;

        return { left: `${Math.max(0, left)}%`, width: `${Math.max(1, width)}%` };
    };

    // Helper function to get responsible person initials
    const getResponsibleInitials = (assignedTechId: string | null): string => {
        if (!assignedTechId || !users) return '';

        const user = users.find((u: any) => u.id === assignedTechId);
        if (!user) return '';

        const firstInitial = user.firstName?.[0]?.toUpperCase() || '';
        const lastInitial = user.lastName?.[0]?.toUpperCase() || '';

        return `${firstInitial}${lastInitial}`;
    };


    return (
        <Layout>
            <div className="p-8" style={{ backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <Link href="/polo-project">
                            <Button variant="ghost" size="sm" className="mb-4">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar para Projetos
                            </Button>
                        </Link>
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{project.nome}</h1>
                                {project.descricao && (
                                    <p className="text-gray-600 mt-2">{project.descricao}</p>
                                )}
                                <div className="flex items-center gap-4 mt-4">
                                    <span className={`text-xs px-3 py-1 rounded-full ${project.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                                        project.status === 'Concluído' ? 'bg-blue-100 text-blue-700' :
                                            project.status === 'Pausado' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {project.status}
                                    </span>
                                    <span className="text-sm text-gray-500 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        {timelineStart && timelineEnd ? (
                                            `${new Date(timelineStart).toLocaleDateString('pt-BR')} - ${new Date(timelineEnd).toLocaleDateString('pt-BR')}`
                                        ) : (
                                            'Sem datas definidas'
                                        )}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                        onClick={() => setIsPauseModalOpen(true)}
                                    >
                                        <History className="w-4 h-4 mr-2" />
                                        Motivos de Pausa
                                        {pausas.some((p: any) => !p.data_retomada) && (
                                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                                                !
                                            </span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={handleNewStage}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nova Etapa
                            </Button>
                        </div>
                    </div>

                    {/* Gantt Chart */}
                    <Card className="bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Gráfico de Gantt
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stages && stages.length > 0 ? (
                                <div className="overflow-x-auto">
                                    {/* Timeline Header */}
                                    <div className="min-w-[1200px]">
                                        {/* Month headers */}
                                        <div className="flex border-b border-gray-300 mb-2">
                                            <div className="w-64 font-semibold text-gray-700">Etapa</div>
                                            <div className="flex-1 flex">
                                                {monthGroups.map((group, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="text-center text-sm font-semibold text-gray-700 border-l border-gray-300 py-1"
                                                        style={{ width: `${(group.days.length / days.length) * 100}%` }}
                                                    >
                                                        {group.month}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Day headers */}
                                        <div className="flex border-b border-gray-200 pb-2 mb-4">
                                            <div className="w-64"></div>
                                            <div className="flex-1 flex">
                                                {days.map((day, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex-1 text-center text-xs text-gray-500 border-l border-gray-100"
                                                        style={{ minWidth: '24px' }}
                                                    >
                                                        {day.getDate()}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Gantt Bars */}
                                        {(() => {
                                            // Ordenar etapas hierarquicamente:
                                            // 1. Etapas de 1º nível por ordem
                                            // 2. Para cada etapa de 1º nível, suas sub-etapas logo abaixo
                                            const sortedStages: any[] = [];
                                            const level1Stages = stages.filter((s: any) => s.nivel === 1 || !s.nivel).sort((a: any, b: any) => a.ordem - b.ordem);
                                            const level2Stages = stages.filter((s: any) => s.nivel === 2);

                                            level1Stages.forEach((parentStage: any) => {
                                                sortedStages.push(parentStage);
                                                // Adicionar sub-etapas desta etapa principal
                                                const subStages = level2Stages
                                                    .filter((s: any) => s.id_etapa_pai === parentStage.id)
                                                    .sort((a: any, b: any) => a.ordem - b.ordem);
                                                sortedStages.push(...subStages);
                                            });

                                            return sortedStages.map((stage: any) => {
                                                const position = getStagePosition(stage);
                                                const isSubStage = stage.nivel === 2;

                                                return (
                                                    <div key={stage.id} className="flex items-center mb-3">
                                                        <div className="w-64">
                                                            <div className={`text-sm text-gray-900 ${isSubStage ? 'pl-6' : 'font-bold'} flex items-center gap-2`}>
                                                                <span>
                                                                    {isSubStage && '└─ '}
                                                                    {stage.nome}
                                                                </span>
                                                                {stage.id_tecnico_atribuido && (
                                                                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium text-white bg-blue-600 rounded-full">
                                                                        {getResponsibleInitials(stage.id_tecnico_atribuido)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className={`text-xs text-gray-500 ${isSubStage ? 'pl-6' : ''}`}>
                                                                {stage.data_inicio && stage.data_fim ? (
                                                                    <>
                                                                        {(() => {
                                                                            const start = dateToInputValue(stage.data_inicio);
                                                                            const end = dateToInputValue(stage.data_fim);
                                                                            const formatDate = (d: string) => {
                                                                                if (!d) return '';
                                                                                const [y, m, d_day] = d.split('-');
                                                                                return `${d_day}/${m}/${y}`;
                                                                            };
                                                                            return `${formatDate(start)} - ${formatDate(end)}`;
                                                                        })()}
                                                                    </>
                                                                ) : (
                                                                    <span className="text-red-500">Datas não definidas</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 relative h-10">
                                                            {/* Grid lines for days */}
                                                            <div className="absolute inset-0 flex">
                                                                {days.map((_, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex-1 border-l border-gray-100"
                                                                    ></div>
                                                                ))}
                                                            </div>
                                                            {/* Stage bar */}
                                                            <div
                                                                className={`absolute h-full rounded cursor-pointer hover:opacity-80 transition-all ${stage.concluida ? 'bg-green-500' : isSubStage ? 'bg-red-500' : 'bg-blue-600'}`}
                                                                style={position}
                                                                onClick={() => handleEdit(stage)}
                                                                title="Clique para editar"
                                                            >
                                                                <div className="h-full flex items-center justify-center px-2">
                                                                    {stage.concluida && (
                                                                        <span className="text-white text-xs font-medium">✓</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 mb-4">Nenhuma etapa cadastrada ainda</p>
                                    <Button
                                        variant="outline"
                                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                        onClick={handleNewStage}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar Primeira Etapa
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Project Progress */}
                    <Card className="bg-white shadow-sm mt-6">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold text-gray-900">
                                Progresso do Projeto
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                                <div
                                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                                    style={{ width: `${project.progresso_geral || 0}%` }}
                                ></div>
                            </div>
                            <div className="text-sm font-medium text-blue-600 text-center">
                                {project.progresso_geral || 0}% Concluído
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Modal para adicionar etapa */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>{isEditMode ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
                                <DialogDescription>
                                    {isEditMode
                                        ? "Edite as informações da etapa do projeto"
                                        : "Adicione uma nova etapa ao gráfico de Gantt do projeto"
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nome da Etapa *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Planejamento"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Input
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Descreva as atividades desta etapa"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="level">Nível da Etapa *</Label>
                                    <Select
                                        value={formData.level.toString()}
                                        onValueChange={(value) => {
                                            const newLevel = parseInt(value);
                                            setFormData({
                                                ...formData,
                                                level: newLevel,
                                                // Limpar parentStageId se mudar para nível 1
                                                parentStageId: newLevel === 1 ? null : formData.parentStageId
                                            });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1º Nível - Etapa Principal</SelectItem>
                                            <SelectItem
                                                value="2"
                                                disabled={!stages || stages.filter((s: any) => s.nivel === 1).length === 0}
                                            >
                                                2º Nível - Sub-Etapa
                                                {(!stages || stages.filter((s: any) => s.nivel === 1).length === 0) &&
                                                    " (crie primeiro uma Etapa Principal)"}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {formData.level === 2 && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="parentStage">Etapa Principal *</Label>
                                        <Select
                                            value={formData.parentStageId?.toString() || undefined}
                                            onValueChange={(value) => setFormData({ ...formData, parentStageId: parseInt(value) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a etapa principal relacionada" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stages?.filter((s: any) => s.nivel === 1).map((stage: any) => (
                                                    <SelectItem key={stage.id} value={stage.id.toString()}>
                                                        {stage.nome} {stage.data_inicio && stage.data_fim ? (
                                                            (() => {
                                                                const start = dateToInputValue(stage.data_inicio);
                                                                const end = dateToInputValue(stage.data_fim);
                                                                const formatDate = (d: string) => {
                                                                    if (!d) return '';
                                                                    const [y, m, d_day] = d.split('-');
                                                                    return `${d_day}/${m}/${y}`;
                                                                };
                                                                return ` (${formatDate(start)} - ${formatDate(end)})`;
                                                            })()
                                                        ) : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="startDate">Data de Início *</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={dateToInputValue(formData.startDate)}
                                            onChange={(e) => setFormData({ ...formData, startDate: inputValueToDate(e.target.value) })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="endDate">Data de Término *</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={dateToInputValue(formData.endDate)}
                                            onChange={(e) => setFormData({ ...formData, endDate: inputValueToDate(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="assignedTech">Técnico Responsável</Label>
                                    <Select
                                        value={formData.assignedTechId || undefined}
                                        onValueChange={(value) => setFormData({ ...formData, assignedTechId: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um técnico (opcional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users?.map((user: any) => (
                                                <SelectItem key={user.id} value={user.id}>
                                                    {user.firstName} {user.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="activityDescription">Descrição da Atividade Realizada</Label>
                                    <Textarea
                                        id="activityDescription"
                                        value={formData.activityDescription}
                                        onChange={(e) => setFormData({ ...formData, activityDescription: e.target.value })}
                                        placeholder="Descreva as atividades que foram realizadas nesta etapa..."
                                        rows={4}
                                        className="resize-none"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="isCompleted"
                                        checked={formData.isCompleted}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, isCompleted: checked as boolean })
                                        }
                                    />
                                    <Label htmlFor="isCompleted" className="text-sm font-normal cursor-pointer">
                                        Marcar como concluída
                                    </Label>
                                </div>
                            </div>
                            <DialogFooter className="gap-2">
                                {isEditMode && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={deleteStageMutation.isPending}
                                        className="mr-auto"
                                    >
                                        {deleteStageMutation.isPending ? "Excluindo..." : "Excluir"}
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={createStageMutation.isPending || updateStageMutation.isPending}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    disabled={createStageMutation.isPending || updateStageMutation.isPending}
                                >
                                    {isEditMode
                                        ? (updateStageMutation.isPending ? "Salvando..." : "Salvar Alterações")
                                        : (createStageMutation.isPending ? "Criando..." : "Criar Etapa")
                                    }
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Dialog para Motivos de Pausa */}
                <Dialog open={isPauseModalOpen} onOpenChange={setIsPauseModalOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Motivos de Pausa</DialogTitle>
                            <DialogDescription>
                                Registre os motivos pelos quais o projeto foi pausado e acompanhe o histórico
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Form to add new pause */}
                            <div className="border rounded-lg p-4 bg-orange-50">
                                <h3 className="font-semibold text-gray-900 mb-3">Adicionar Nova Pausa</h3>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (pauseFormData.motivo && pauseFormData.data_pausa) {
                                            createPauseMutation.mutate({
                                                motivo: pauseFormData.motivo,
                                                data_pausa: pauseFormData.data_pausa,
                                            });
                                        }
                                    }}
                                    className="space-y-3"
                                >
                                    <div>
                                        <Label htmlFor="motivo">Motivo da Pausa *</Label>
                                        <Textarea
                                            id="motivo"
                                            value={pauseFormData.motivo}
                                            onChange={(e) => setPauseFormData({ ...pauseFormData, motivo: e.target.value })}
                                            placeholder="Descreva o motivo da pausa..."
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="data_pausa">Data da Pausa *</Label>
                                        <Input
                                            id="data_pausa"
                                            type="date"
                                            value={pauseFormData.data_pausa}
                                            onChange={(e) => setPauseFormData({ ...pauseFormData, data_pausa: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full bg-orange-600 hover:bg-orange-700"
                                        disabled={createPauseMutation.isPending}
                                    >
                                        {createPauseMutation.isPending ? "Registrando..." : "Registrar Pausa"}
                                    </Button>
                                </form>
                            </div>

                            {/* Historical list of pauses */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Histórico de Pausas</h3>
                                {pausas && pausas.length > 0 ? (
                                    <div className="space-y-3">
                                        {pausas.map((pausa: any) => (
                                            <div
                                                key={pausa.id}
                                                className={`border rounded-lg p-4 ${!pausa.data_retomada ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {!pausa.data_retomada ? (
                                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-200 rounded">
                                                                ⏸️ Em Pausa
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-200 rounded">
                                                                ✓ Retomado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(pausa.criado_em).toLocaleString('pt-BR')}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-xs font-semibold text-gray-600">Motivo:</span>
                                                        <p className="text-sm text-gray-900 mt-1">{pausa.motivo}</p>
                                                    </div>

                                                    <div className="flex gap-4 text-sm">
                                                        <div>
                                                            <span className="text-xs font-semibold text-gray-600">Pausado em:</span>
                                                            <p className="text-gray-900">
                                                                {formatDateWithoutTimezone(pausa.data_pausa)}
                                                            </p>
                                                        </div>
                                                        {pausa.data_retomada && (
                                                            <div>
                                                                <span className="text-xs font-semibold text-gray-600">Retomado em:</span>
                                                                <p className="text-gray-900">
                                                                    {formatDateWithoutTimezone(pausa.data_retomada)}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {!pausa.data_retomada && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="mt-2 text-green-600 border-green-300 hover:bg-green-50"
                                                            onClick={() => {
                                                                const today = new Date().toISOString().split('T')[0];
                                                                updatePauseMutation.mutate({
                                                                    id: pausa.id,
                                                                    data_retomada: today,
                                                                });
                                                            }}
                                                            disabled={updatePauseMutation.isPending}
                                                        >
                                                            {updatePauseMutation.isPending ? "Marcando..." : "Marcar como Retomado"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>Nenhuma pausa registrada ainda</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsPauseModalOpen(false)}
                            >
                                Fechar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
