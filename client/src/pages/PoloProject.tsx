import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function PoloProject() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "Ativo",
    });

    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: dashboardStats, isLoading } = useQuery({
        queryKey: ["/api/polo-projects/dashboard"],
        queryFn: async () => {
            const response = await fetch("/api/polo-projects/dashboard");
            if (!response.ok) throw new Error("Failed to fetch dashboard stats");
            return response.json();
        },
    });

    const { data: projects } = useQuery({
        queryKey: ["/api/polo-projects"],
        queryFn: async () => {
            const response = await fetch("/api/polo-projects");
            if (!response.ok) throw new Error("Failed to fetch projects");
            return response.json();
        },
    });

    // Fetch available projects and cards to create association
    const { data: availableProjects } = useQuery({
        queryKey: ["/api/projects"],
        queryFn: async () => {
            const response = await fetch("/api/projects");
            if (!response.ok) throw new Error("Failed to fetch projects");
            return response.json();
        },
    });

    const createPoloProjectMutation = useMutation({
        mutationFn: async (data: { name: string; description: string; status: string }) => {
            // First, ensure we have a project to associate with
            let projectId = availableProjects?.[0]?.id;

            // If no project exists, create a default "Polo Projects" project
            if (!projectId) {
                const clients = await fetch("/api/clients").then(res => res.json());
                const defaultClient = clients.find((c: any) => c.name === "PoloTelecom") || clients[0];

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
                const projectResponse = await fetch("/api/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: "Polo Projects",
                        description: "Projeto container para Polo Projects",
                        clientId: defaultClient.id,
                        techLeadId: defaultUser.id,
                        defaultTemplateId: defaultTemplate.id,
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
            const project = await fetch(`/api/projects/${projectId}`).then(res => res.json());
            const firstColumn = project.columns?.[0];

            if (!firstColumn) {
                throw new Error("Projeto não possui colunas configuradas");
            }

            // Create a card to associate with the Polo Project
            const cardResponse = await fetch(`/api/projects/${projectId}/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: data.name,
                    description: data.description || "Card automático para Polo Project",
                    columnId: firstColumn.id,
                }),
            });

            if (!cardResponse.ok) {
                throw new Error("Falha ao criar card associado");
            }

            const newCard = await cardResponse.json();

            // Now create the Polo Project
            const poloProjectResponse = await fetch("/api/polo-projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: newCard.id,
                    name: data.name,
                    description: data.description,
                    status: data.status,
                }),
            });

            if (!poloProjectResponse.ok) {
                const error = await poloProjectResponse.json();
                throw new Error(error.message || "Falha ao criar Polo Project");
            }

            return poloProjectResponse.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projects"] });
            queryClient.invalidateQueries({ queryKey: ["/api/polo-projects/dashboard"] });
            toast({
                title: "Projeto criado!",
                description: "O Polo Project foi criado com sucesso.",
            });
            setDialogOpen(false);
            setFormData({ name: "", description: "", status: "Ativo" });
        },
        onError: (error: any) => {
            toast({
                title: "Erro ao criar projeto",
                description: error.message || "Ocorreu um erro ao criar o projeto.",
                variant: "destructive",
            });
        },
    });

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
                                <Button className="bg-blue-600 hover:bg-blue-700">
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
                                            className="bg-blue-600 hover:bg-blue-700"
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
                                                style={{ width: `${dashboardStats?.overallProgress || 0}%` }}
                                            ></div>
                                        </div>
                                        <div className="text-xs font-medium text-blue-600 text-center">
                                            {dashboardStats?.overallProgress || 0}% Concluído
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
                        </CardHeader>
                        <CardContent>
                            {projects && projects.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {projects.map((project: any) => (
                                        <Link key={project.id} href={`/polo-project/${project.id}`}>
                                            <div className="p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
                                                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                                                {project.description && (
                                                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.description}</p>
                                                )}
                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className={`text-xs px-2 py-1 rounded ${project.status === 'Ativo' ? 'bg-green-100 text-green-700' :
                                                        project.status === 'Concluído' ? 'bg-blue-100 text-blue-700' :
                                                            project.status === 'Pausado' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-gray-100 text-gray-700'
                                                        }`}>
                                                        {project.status}
                                                    </span>
                                                    {project.stages && (
                                                        <span className="text-xs text-gray-500">
                                                            {project.stages.length} etapas
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className=" text-gray-500 mb-4">Nenhum projeto criado ainda</p>
                                    <Button
                                        variant="outline"
                                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                        onClick={() => setDialogOpen(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar Primeiro Projeto
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
