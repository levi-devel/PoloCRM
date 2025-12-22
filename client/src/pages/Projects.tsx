import { Layout } from "@/components/layout/Layout";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useUsers } from "@/hooks/use-users";
import { useFormTemplates } from "@/hooks/use-forms";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProjectFormValues = z.infer<typeof insertProjectSchema>;

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: clients } = useClients();
  const { data: users } = useUsers();
  const { data: templates } = useFormTemplates();
  const createProject = useCreateProject();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Ativo",
      priority: "Média"
    }
  });

  const onSubmit = (data: ProjectFormValues) => {
    createProject.mutate(data, {
      onSuccess: () => {
        setIsOpen(false);
        form.reset();
      }
    });
  };

  const getClientName = (id: number) => clients?.find(c => c.id === id)?.name || "Unknown Client";

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-2">Track progress and manage deliverables.</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4 mr-2" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Website Redesign" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(parseInt(val))} 
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="techLeadId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tech Lead</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select lead" />
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
                  </div>

                  <FormField
                    control={form.control}
                    name="defaultTemplateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task Template</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(parseInt(val))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select form template" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates?.map(t => (
                              <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Used for new cards in this project.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Project details..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""} onChange={e => field.onChange(new Date(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""} onChange={e => field.onChange(new Date(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createProject.isPending}>
                    {createProject.isPending ? "Creating..." : "Create Project"}
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
                    <h3 className="text-lg font-bold font-display">{project.name}</h3>
                    <Badge variant={project.status === "Ativo" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FolderKanban className="w-4 h-4" />
                      <span>{getClientName(project.clientId)}</span>
                    </div>
                    {project.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Due {format(new Date(project.dueDate), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                     {/* Mock avatars */}
                     {[1,2,3].map(i => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                         U{i}
                       </div>
                     ))}
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button variant="outline" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Open Board <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
