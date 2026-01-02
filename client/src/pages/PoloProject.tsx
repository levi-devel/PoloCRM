import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, TrendingUp, Trash2, Search, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function PoloProject() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "Ativo",
        startDate: "",
        endDate: "",
    });

    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [location, setLocation] = useLocation();
    const { user } = useAuth();

    // Check permissions - apenas Admin e Gerentes podem excluir
    const canDelete = user?.role === "Admin" || user?.role === "Gerente Supervisor" || user?.role === "Gerente Comercial";

    const { data: dashboardStats, isLoading } = useQuery({
        queryKey: ["/api/polo-projetos/dashboard"],
        queryFn: async () => {
            const response = await fetch("/api/polo-projetos/dashboard");
            if (!response.ok) throw new Error("Failed to fetch dashboard stats");
            return response.json();
        },
    });

    const { data: projects } = useQuery({
        queryKey: ["/api/polo-projetos"],
        queryFn: async () => {
            const response = await fetch("/api/polo-projetos");
            if (!response.ok) throw new Error("Failed to fetch projects");
            return response.json();
        },
    });

    // Filter projects based on search term
    const filteredProjects = projects?.filter((project: any) =>
        project.nome.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    // Fetch available projects and cards to create association
    const { data: availableProjects } = useQuery({
        queryKey: ["/api/projetos"],
        queryFn: async () => {
            const response = await fetch("/api/projetos");
            if (!response.ok) throw new Error("Failed to fetch projects");
            return response.json();
        },
    });

    const createPoloProjectMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; status: string; startDate?: string; endDate?: string }) => {
            // First, ensure we have a project to associate with
            let targetProject = availableProjects?.find((p: any) => p.nome === "Projetos Polo");
            let projectId = targetProject?.id;

            // If the specific project doesn't exist, create it
            if (!projectId) {
                const clients = await fetch("/api/clientes").then(res => res.json());
                const defaultClient = clients.find((c: any) => c.nome === "PoloTelecom") || clients[0];

                if (!defaultClient) {
                    throw new Error("Nenhum cliente disponível no sistema");
                }

                const users = await fetch("/api/users").then(res => res.json());
                const defaultUser = users[0];

                if (!defaultUser) {
                    throw new Error("Nenhum usuário disponível no sistema");
                }

                const templates = await fetch("/api/form-templates").then(res => res.json());
                const defaultTemplate = templates[0];

                if (!defaultTemplate) {
                    throw new Error("Nenhum template disponível no sistema");
                }

                // Create default project
                const projectResponse = await fetch("/api/projetos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nome: "Projetos Polo",
                        descricao: "Projeto container para Polo Projects",
                        id_cliente: defaultClient.id,
                        id_lider_tecnico: defaultUser.id,
                        id_modelo_padrao: defaultTemplate.id,
                        status: "Ativo",
                    }),
                });

                if (!projectResponse.ok) {
                    throw new Error("Falha ao criar projeto padrão");
                }

                const newProject = await projectResponse.json();
                projectId = newProject.id;
            }

            // Get the project columns
            const project = await fetch(`/api/projetos/${projectId}`).then(res => res.json());
            const firstColumn = project.columns?.[0];

            if (!firstColumn) {
                throw new Error("Projeto não possui colunas configuradas");
            }

            // Create a card to associate with the Polo Project
            const cardResponse = await fetch(`/api/projetos/${projectId}/cartoes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    titulo: data.name,
                    descricao: data.description || "Card automático para Polo Project",
                    id_coluna: firstColumn.id,
                }),
            });

            if (!cardResponse.ok) {
                throw new Error("Falha ao criar card associado");
            }

            const newCard = await cardResponse.json();

            // Now create the Polo Project
            const poloProjectResponse = await fetch("/api/polo-projetos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_cartao: newCard.id,
                    nome: data.name,
                    descricao: data.description,
                    status: data.status,
                    data_inicial: data.startDate || null,
                    data_final: data.endDate || null,
                }),
            });

            if (!poloProjectResponse.ok) {
                const error = await poloProjectResponse.json();
                throw new Error(error.message || "Falha ao criar Polo Project");
            }

            return poloProjectResponse.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projetos"] });
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projetos/dashboard"] });
            toast({
                title: "Projeto criado!",
                description: "O Polo Project foi criado com sucesso.",
            });
            setDialogOpen(false);
            setFormData({ name: "", description: "", status: "Ativo", startDate: "", endDate: "" });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar projeto",
                description: error.message || "Ocorreu um erro ao criar o projeto.",
                variant: "destructive",
            });
        },
    });

    const deletePoloProjectMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await fetch(`/api/polo-projetos/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Falha ao excluir projeto");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projetos"] });
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projetos/dashboard"] });
            toast({
                title: "Projeto excluído",
                description: "O Polo Project foi excluído com sucesso.",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao excluir",
                description: error.message || "Ocorreu um erro ao excluir o projeto.",
                variant: "destructive",
            });
        },
    });

    const updatePoloProjectMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: { nome: string; descricao?: string; status: string; data_inicial?: string | null; data_final?: string | null } }) => {
            const response = await fetch(`/api/polo-projetos/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to update project");
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projetos"] });
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projetos/dashboard"] });
            toast({
                title: "Projeto atualizado",
                description: "As informações do projeto foram atualizadas com sucesso.",
            });
            setEditDialogOpen(false);
            setEditingProject(null);
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao atualizar",
                description: error.message || "Falha ao atualizar o projeto",
                variant: "destructive",
            });
        },
    });

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);

    const handleEditClick = (project: any, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProject({
            id: project.id,
            nome: project.nome,
            descricao: project.descricao,
            status: project.status,
            data_inicial: project.data_inicial || "",
            data_final: project.data_final || ""
        });
        setEditDialogOpen(true);
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Form submitted with data:", formData);
        console.log("Available projects:", availableProjects);

        if (!formData.name.trim()) {
            toast({
                title: "Nome obrigatório",
                description: "Por favor, insira um nome para o projeto.",
                variant: "destructive",
            });
            return;
        }
        console.log("Calling mutation...");
        createPoloProjectMutation.mutate(formData);
    };

    return (
        <Layout>
            <div className="p-8" style={{ backgroundColor: "#F3F4F6", minHeight: "100vh" }}>
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Polo Project</h1>
                            <p className="text-gray-600 mt-1">Gerencie seus projetos estilo Microsoft Project</p>
                        </div>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Novo Projeto
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="font-display text-2xl">Criar Novo Polo Project</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome do Projeto *</Label>
                                        <Input
                                            id="name"
                                            placeholder="Digite o nome do projeto"
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descrição</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Descreva o projeto (opcional)"
                                            value={formData.description}
                                            onChange={(e) =>
                                                setFormData({ ...formData, description: e.target.value })
                                            }
                                            rows={3}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="startDate">Data Inicial</Label>
                                            <Input
                                                id="startDate"
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, startDate: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="endDate">Data Final</Label>
                                            <Input
                                                id="endDate"
                                                type="date"
                                                value={formData.endDate}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, endDate: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="status">Status</Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value) =>
                                                setFormData({ ...formData, status: value })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ativo">Ativo</SelectItem>
                                                <SelectItem value="Pausado">Pausado</SelectItem>
                                                <SelectItem value="Concluído">Concluído</SelectItem>
                                                <SelectItem value="Cancelado">Cancelado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex gap-3 justify-end pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setDialogOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={createPoloProjectMutation.isPending}
                                        >
                                            {createPoloProjectMutation.isPending ? "Criando..." : "Criar Projeto"}
                                        </Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Dashboard Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Active Projects Card */}
                        <Card className="bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-800">
                                    Projetos Ativos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
                                ) : (
                                    <div className="text-4xl font-bold text-blue-600">
                                        {dashboardStats?.activeProjects || 0}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Upcoming Deadlines Card */}
                        <Card className="bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2" />
                                    Próximos Prazos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                ) : dashboardStats?.upcomingDeadlines && dashboardStats.upcomingDeadlines.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {dashboardStats.upcomingDeadlines.map((deadline: any, index: number) => (
                                            <div key={index} className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="text-sm text-gray-600">{deadline.stageName}</div>
                                                    <div className="text-xs text-gray-500">{deadline.projectName}</div>
                                                </div>
                                                <div className={`text-sm ${deadline.daysUntil <= 3 ? 'font-medium text-red-500' : 'text-gray-500'}`}>
                                                    {deadline.daysUntil === 0 ? 'Hoje' : deadline.daysUntil === 1 ? 'Amanhã' : `${deadline.daysUntil}d`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">Nenhum prazo próximo</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Overall Progress Card */}
                        <Card className="bg-white shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                                    <TrendingUp className="w-5 h-5 mr-2" />
                                    Progresso Geral
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <div className="animate-pulse h-16 bg-gray-200 rounded"></div>
                                ) : (
                                    <>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                                style={{ width: `${dashboardStats?.progresso_geral || 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs font-medium text-blue-600 text-center">
                                            {dashboardStats?.progresso_geral || 0}% Concluído
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Projects List */}
                    <Card className="bg-white shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-900">
                                Meus Projetos
                            </CardTitle>
                            <CardDescription>
                                Clique em um projeto para visualizar o gráfico de Gantt
                            </CardDescription>
                            {/* Search Input */}
                            {projects && projects.length > 0 && (
                                <div className="relative mt-4">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar projetos por nome..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            )}
                        </CardHeader>
                        <CardContent>
                            {projects && projects.length > 0 ? (
                                <>
                                    {filteredProjects.length > 0 ? (
                                        <div className="space-y-4">
                                            {filteredProjects.map((project: any) => {
                                                // Helper function to get progress bar color
                                                const getProgressColor = (progress: number) => {
                                                    if (progress <= 30) return '#ef4444'; // red
                                                    if (progress <= 60) return '#f59e0b'; // orange
                                                    if (progress <= 90) return '#3b82f6'; // blue
                                                    return '#10b981'; // green
                                                };

                                                // Helper function to calculate deadline status
                                                const getDeadlineStatus = (prazo_final: string | null) => {
                                                    if (!prazo_final) return {
                                                        color: 'gray',
                                                        text: 'Sem prazo',
                                                        days: null,
                                                        bgColor: '#f3f4f6',
                                                        textColor: '#6b7280'
                                                    };

                                                    const now = new Date();
                                                    const deadline = new Date(prazo_final);
                                                    const diffTime = deadline.getTime() - now.getTime();
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    if (diffDays < 0) {
                                                        return {
                                                            color: 'red',
                                                            text: `Atrasado (${Math.abs(diffDays)}d)`,
                                                            days: diffDays,
                                                            bgColor: '#fef2f2',
                                                            textColor: '#ef4444'
                                                        };
                                                    } else if (diffDays <= 4) {
                                                        return {
                                                            color: 'yellow',
                                                            text: `Em ${diffDays} dias`,
                                                            days: diffDays,
                                                            bgColor: '#fffbeb',
                                                            textColor: '#f59e0b'
                                                        };
                                                    } else {
                                                        return {
                                                            color: 'green',
                                                            text: `Em ${diffDays} dias`,
                                                            days: diffDays,
                                                            bgColor: '#f0fdf4',
                                                            textColor: '#10b981'
                                                        };
                                                    }
                                                };

                                                const progressColor = getProgressColor(project.progresso_geral || 0);
                                                const deadlineStatus = getDeadlineStatus(project.prazo_final);

                                                // Format date for display
                                                const formatDate = (dateStr: string | null) => {
                                                    if (!dateStr) return '--/--/----';
                                                    // Parse date without timezone conversion
                                                    const [year, month, day] = dateStr.split('-');
                                                    return `${day}/${month}/${year}`;
                                                };

                                                const formatUpdateDate = (dateStr: string) => {
                                                    const date = new Date(dateStr);
                                                    return date.toLocaleDateString('pt-BR');
                                                };

                                                return (
                                                    <div
                                                        key={project.id}
                                                        className="border rounded-lg p-5 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer relative group bg-white"
                                                        onClick={() => setLocation(`/polo-project/${project.id}`)}
                                                    >
                                                        {/* Header */}
                                                        <div className="flex items-start justify-between mb-3">
                                                            <div className="flex items-center gap-3 flex-wrap">
                                                                <h3 className="font-bold text-lg text-gray-900">{project.nome}</h3>
                                                                <span className={`text-xs px-2.5 py-1 rounded-full ${project.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                                                                    project.status === 'Concluído' ? 'bg-blue-100 text-blue-700' :
                                                                        project.status === 'Pausado' ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {project.status === 'Ativo' && '🟢 '}
                                                                    {project.status === 'Pausado' && '🟡 '}
                                                                    {project.status === 'Concluído' && '✅ '}
                                                                    {project.status === 'Cancelado' && '❌ '}
                                                                    {project.status}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {project.etapas_count || project.stages?.length || 0} etapas
                                                                </span>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {/* Edit button - visível para todos */}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                                    onClick={(e) => handleEditClick(project, e)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>

                                                                {/* Delete button - apenas para Admin e Gerentes */}
                                                                {canDelete && (
                                                                    <div onClick={(e) => e.stopPropagation()}>
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </AlertDialogTrigger>
                                                                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle>Excluir Projeto</AlertDialogTitle>
                                                                                    <AlertDialogDescription>
                                                                                        Tem certeza que deseja excluir o projeto "{project.nome}"?
                                                                                        Esta ação não pode ser desfeita. O card do Kanban permanecerá, mas o Polo Project será removido.
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                                                                    <AlertDialogAction
                                                                                        className="bg-red-600 hover:bg-red-700"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            deletePoloProjectMutation.mutate(project.id);
                                                                                        }}
                                                                                    >
                                                                                        Excluir
                                                                                    </AlertDialogAction>
                                                                                </AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Subtitle */}
                                                        <div className="text-sm text-gray-600 mb-4">
                                                            {project.status === 'Ativo' && 'Em andamento'}
                                                            {project.status === 'Pausado' && 'Pausado'}
                                                            {project.status === 'Concluído' && 'Concluído'}
                                                            {project.status === 'Cancelado' && 'Cancelado'}
                                                            {' • '}
                                                            <span className="text-gray-500">
                                                                Atualizado: {formatUpdateDate(project.data_atualizacao || project.criado_em)}
                                                            </span>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="mb-4">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm font-medium text-gray-700">Progresso</span>
                                                                <span className="text-sm font-bold" style={{ color: progressColor }}>
                                                                    {project.progresso_geral || 0}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-gray-200 rounded-full h-3">
                                                                <div
                                                                    className="h-3 rounded-full transition-all duration-300"
                                                                    style={{
                                                                        width: `${project.progresso_geral || 0}%`,
                                                                        backgroundColor: progressColor
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                • Destaque sincronizado
                                                            </div>
                                                        </div>

                                                        {/* Deadline Badge */}
                                                        <div className="flex items-center justify-between pt-3 border-t">
                                                            <div
                                                                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                                                                style={{ backgroundColor: deadlineStatus.bgColor }}
                                                            >
                                                                <Calendar className="w-4 h-4" style={{ color: deadlineStatus.textColor }} />
                                                                <span className="text-sm font-medium" style={{ color: deadlineStatus.textColor }}>
                                                                    Prazo Final: {formatDate(project.prazo_final)}
                                                                </span>
                                                            </div>
                                                            <div
                                                                className="px-3 py-1.5 rounded-full text-xs font-medium"
                                                                style={{
                                                                    backgroundColor: deadlineStatus.bgColor,
                                                                    color: deadlineStatus.textColor
                                                                }}
                                                            >
                                                                {deadlineStatus.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12">
                                            <p className="text-gray-500 mb-4">Nenhum projeto encontrado com "{searchTerm}"</p>
                                            <Button
                                                variant="outline"
                                                onClick={() => setSearchTerm("")}
                                            >
                                                Limpar busca
                                            </Button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 mb-4">Nenhum projeto criado ainda</p>
                                    <Button
                                        onClick={() => setDialogOpen(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar Primeiro Projeto
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Edit Project Dialog */}
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Editar Projeto</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-name">Nome do Projeto</Label>
                                    <Input
                                        id="edit-name"
                                        value={editingProject?.nome || ""}
                                        onChange={(e) => setEditingProject((prev: any) => ({ ...prev, nome: e.target.value }))}
                                        placeholder="Digite o nome do projeto"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-description">Descrição</Label>
                                    <Textarea
                                        id="edit-description"
                                        value={editingProject?.descricao || ""}
                                        onChange={(e) => setEditingProject((prev: any) => ({ ...prev, descricao: e.target.value }))}
                                        placeholder="Descreva o projeto (opcional)"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-startDate">Data Inicial</Label>
                                        <Input
                                            id="edit-startDate"
                                            type="date"
                                            value={editingProject?.data_inicial || ""}
                                            onChange={(e) => setEditingProject((prev: any) => ({ ...prev, data_inicial: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-endDate">Data Final</Label>
                                        <Input
                                            id="edit-endDate"
                                            type="date"
                                            value={editingProject?.data_final || ""}
                                            onChange={(e) => setEditingProject((prev: any) => ({ ...prev, data_final: e.target.value }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-status">Status</Label>
                                    <Select
                                        value={editingProject?.status || "Ativo"}
                                        onValueChange={(value) => setEditingProject((prev: any) => ({ ...prev, status: value }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Ativo">🟢 Ativo</SelectItem>
                                            <SelectItem value="Pausado">🟡 Pausado</SelectItem>
                                            <SelectItem value="Concluído">✅ Concluído</SelectItem>
                                            <SelectItem value="Cancelado">❌ Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => {
                                        if (editingProject) {
                                            updatePoloProjectMutation.mutate({
                                                id: editingProject.id,
                                                data: {
                                                    nome: editingProject.nome.trim(),
                                                    descricao: editingProject.descricao?.trim(),
                                                    status: editingProject.status,
                                                    data_inicial: editingProject.data_inicial || null,
                                                    data_final: editingProject.data_final || null
                                                }
                                            });
                                        }
                                    }}
                                    disabled={updatePoloProjectMutation.isPending || !editingProject?.nome}
                                >
                                    {updatePoloProjectMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </Layout>
    );
}
