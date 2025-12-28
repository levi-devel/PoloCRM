import { Layout } from "@/components/layout/Layout";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useUsers } from "@/hooks/use-users";
import { useFormTemplates } from "@/hooks/use-forms";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Calendar, ArrowRight, Trash2, Pencil } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { dateToInputValue, inputValueToDate } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjetoSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProjectFormValues = z.infer<typeof insertProjetoSchema>;

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const { data: users } = useUsers();
  const { data: templates } = useFormTemplates();
  const { user } = useAuth();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const updateProject = useUpdateProject(projectToEdit?.id || 0);

  const canEdit = user && ["Admin", "Gerente Comercial", "Gerente Supervisor"].includes(user.role);
  const canDelete = user && ["Admin", "Gerente Comercial", "Gerente Supervisor"].includes(user.role);

  const createForm = useForm<ProjectFormValues>({
    resolver: zodResolver(insertProjetoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      status: "Ativo",
      prioridade: "Média"
    }
  });

  const editForm = useForm<ProjectFormValues>({
    resolver: zodResolver(insertProjetoSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      status: "Ativo",
      prioridade: "Média"
    }
  });

  const onCreateSubmit = (data: ProjectFormValues) => {
    createProject.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
        createForm.reset();
      }
    });
  };

  const onEditSubmit = (data: ProjectFormValues) => {
    updateProject.mutate(data, {
      onSuccess: () => {
        setIsEditOpen(false);
        setProjectToEdit(null);
        editForm.reset();
      }
    });
  };

  const handleEditClick = (project: any) => {
    setProjectToEdit(project);
    editForm.reset({
      nome: project.nome,
      descricao: project.descricao || "",
      status: project.status,
      prioridade: project.prioridade,
      id_lider_tecnico: project.id_lider_tecnico,
      id_modelo_padrao: project.id_modelo_padrao,
      id_cliente: project.id_cliente,
      data_inicio: project.data_inicio,
      data_prazo: project.data_prazo,
    });
    setIsEditOpen(true);
  };

  const getClientName = (id: number | null | undefined) => {
    if (!id) return "Sem Cliente";
    return clients?.find(c => c.id === id)?.nome || "Cliente Desconhecido";
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Projetos</h1>
            <p className="text-muted-foreground mt-2">Acompanhe o progresso e gerencie entregas.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Projeto</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Projeto</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Redesign do Site" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="id_lider_tecnico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Líder Técnico</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o líder" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="id_modelo_padrao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo de Tarefa</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(parseInt(val))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o modelo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.map(t => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Usado para novos cartões neste projeto.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="descricao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detalhes do projeto..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="data_inicio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={dateToInputValue(field.value)}
                              onChange={e => field.onChange(inputValueToDate(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="data_prazo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Término</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={dateToInputValue(field.value)}
                              onChange={e => field.onChange(inputValueToDate(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createProject.isPending}>
                    {createProject.isPending ? "Criando..." : "Criar Projeto"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {projects?.map((project) => (
              <div
                key={project.id}
                className="group bg-card border border-border/50 rounded-xl p-6 hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold font-display">{project.nome}</h3>
                    <Badge variant={project.status === "Ativo" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FolderKanban className="w-4 h-4" />
                      <span>{getClientName(project.id_cliente)}</span>
                    </div>
                    {project.data_prazo && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Entrega: {format(new Date(project.data_prazo), "dd/MM/yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {/* Mock avatars */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        U{i}
                      </div>
                    ))}
                  </div>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-muted-foreground hover:text-primary"
                      onClick={() => handleEditClick(project)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Abrir Quadro <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setProjectToDelete(project.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Projeto?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este projeto? Esta ação apagará todos os cartões, colunas e dados associados permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (projectToDelete) {
                    deleteProject.mutate(projectToDelete);
                    setProjectToDelete(null);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Project Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Projeto</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Projeto</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Redesign do Site" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="id_lider_tecnico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Líder Técnico</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o líder" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="id_modelo_padrao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo de Tarefa</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o modelo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates?.map(t => (
                            <SelectItem key={t.id} value={t.id.toString()}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Usado para novos cartões neste projeto.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Detalhes do projeto..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="data_inicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateToInputValue(field.value)}
                            onChange={e => field.onChange(inputValueToDate(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="data_prazo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Término</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={dateToInputValue(field.value)}
                            onChange={e => field.onChange(inputValueToDate(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={updateProject.isPending}>
                  {updateProject.isPending ? "Atualizando..." : "Atualizar Projeto"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

