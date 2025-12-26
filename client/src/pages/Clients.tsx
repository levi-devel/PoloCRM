import { Layout } from "@/components/layout/Layout";
import { useClients, useCreateClient, useUpdateClient } from "@/hooks/use-clients";
import { useMilvusClients } from "@/hooks/use-milvus-clients";
import { Button } from "@/components/ui/button";
import { Plus, Search, Building2, Phone, Mail, Users, Edit, X, Check, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@shared/schema";
import { cn } from "@/lib/utils";

type ClientFormValues = z.infer<typeof insertClientSchema>;

function TagInput({ value, onChange, placeholder }: { value?: string[], onChange: (value: string[]) => void, placeholder: string }) {
  const [inputValue, setInputValue] = useState("");
  const tags = value || [];

  const addTag = () => {
    if (inputValue.trim() && !tags.includes(inputValue.trim())) {
      onChange([...tags, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" onClick={addTag} variant="outline">
          Adicionar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
          </Badge>
        ))}
      </div>
    </div>
  );
}

// Utility function to strip HTML tags from text
function stripHtmlTags(html: string): string {
  // Create a temporary div element to parse HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // Get text content which automatically strips tags
  return tmp.textContent || tmp.innerText || '';
}

function ClientFormDialog({
  client,
  isOpen,
  onOpenChange
}: {
  client?: Client,
  isOpen: boolean,
  onOpenChange: (open: boolean) => void
}) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient(client?.id || 0);
  const isEditing = !!client;

  const [searchQuery, setSearchQuery] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const { data: milvusClients, isLoading: isMilvusLoading } = useMilvusClients(searchQuery);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: client ? {
      name: client.name || "",
      cnpj: client.cnpj || "",
      contact: client.contact || "",
      email: client.email || "",
      phone: client.phone || "",
      notes: client.notes || "",
      milvusNotes: client.milvusNotes || "",
      description: client.description || "",
      contractedProducts: client.contractedProducts || [],
      contractedAutomations: client.contractedAutomations || [],
      contractLimitUsers: client.contractLimitUsers || undefined,
      contractLimitAgents: client.contractLimitAgents || undefined,
      contractLimitSupervisors: client.contractLimitSupervisors || undefined,
      contractStartDate: client.contractStartDate || undefined,
      accessUrl: client.accessUrl || "",
      apiUsed: client.apiUsed || "",
      credentials: client.credentials || "",
      definedScope: client.definedScope || "",
      outOfScope: client.outOfScope || "",
      internalManagers: client.internalManagers || [],
      knowledgeBase: client.knowledgeBase || "",
      technicalSpecPath: client.technicalSpecPath || "",
      risks: client.risks || "",
      currentPending: client.currentPending || "",
      relevantIncidents: client.relevantIncidents || "",
      technicalDecisions: client.technicalDecisions || "",
    } : {
      name: "",
      cnpj: "",
      contact: "",
      email: "",
      phone: "",
      notes: "",
      milvusNotes: ""
    }
  });

  const onSubmit = (data: ClientFormValues) => {
    if (isEditing) {
      updateClient.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        }
      });
    } else {
      createClient.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        }
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar Cliente" : "Adicionar Novo Cliente"}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="contract">Contrato</TabsTrigger>
              <TabsTrigger value="technical">Técnico</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nome da Empresa *</FormLabel>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || "Selecione ou digite o nome da empresa..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[600px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Pesquisar cliente no Milvus..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {isMilvusLoading ? "Carregando..." : "Nenhum cliente encontrado."}
                            </CommandEmpty>
                            <CommandGroup>
                              {milvusClients?.map((milvusClient) => (
                                <CommandItem
                                  key={milvusClient.id}
                                  value={milvusClient.nome_fantasia}
                                  onSelect={() => {
                                    field.onChange(milvusClient.nome_fantasia);
                                    // Auto-fill CNPJ and Milvus Notes
                                    if (milvusClient.cnpj_cpf) {
                                      form.setValue("cnpj", milvusClient.cnpj_cpf);
                                    }
                                    if (milvusClient.observacao) {
                                      // Strip HTML tags from observation
                                      const cleanObservation = stripHtmlTags(milvusClient.observacao);
                                      form.setValue("milvusNotes", cleanObservation);
                                    }
                                    setComboboxOpen(false);
                                    setSearchQuery("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === milvusClient.nome_fantasia
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{milvusClient.nome_fantasia}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {milvusClient.cnpj_cpf && `CNPJ: ${milvusClient.cnpj_cpf}`}
                                      {milvusClient.razao_social && milvusClient.razao_social !== milvusClient.nome_fantasia &&
                                        ` • ${milvusClient.razao_social}`}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                        <div className="border-t p-2">
                          <Input
                            placeholder="Ou digite um nome personalizado..."
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000/0000-00" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pessoa de Contato</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
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
                        <Input placeholder="+55 11 99999..." {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@acme.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Cliente</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição geral do cliente..." {...field} value={field.value || ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="milvusNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Milvus)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações vindas do Milvus..."
                        {...field}
                        value={field.value || ""}
                        rows={3}
                        className="bg-muted/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Contract Details Tab */}
            <TabsContent value="contract" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="contractedProducts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produtos Contratados</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Digite um produto e pressione Enter"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contractedAutomations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Automações Contratadas</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Digite uma automação e pressione Enter"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="contractLimitUsers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Usuários</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractLimitAgents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Agentes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contractLimitSupervisors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Supervisores</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="contractStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Inicial do Contrato</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={dateToInputValue(field.value)}
                        onChange={(e) => field.onChange(inputValueToDate(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Technical Information Tab */}
            <TabsContent value="technical" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="accessUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de Acesso</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Utilizada</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome ou endpoint da API" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credentials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credenciais</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Credenciais de acesso (campo sensível)" {...field} value={field.value || ""} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="definedScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escopo Definido</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descrição do escopo do projeto..." {...field} value={field.value || ""} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outOfScope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fora do Escopo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="O que está fora do escopo..." {...field} value={field.value || ""} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="internalManagers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsáveis Internos</FormLabel>
                    <FormControl>
                      <TagInput
                        value={field.value || []}
                        onChange={field.onChange}
                        placeholder="Nome do responsável"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="knowledgeBase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base de Conhecimento Geral</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Informações importantes sobre o cliente..." {...field} value={field.value || ""} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="technicalSpecPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caminho da Especificação Técnica</FormLabel>
                    <FormControl>
                      <Input placeholder="URL ou caminho do arquivo" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* Quick History Tab */}
            <TabsContent value="history" className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="risks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Riscos / Pontos de Atenção</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Riscos identificados..." {...field} value={field.value || ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentPending"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pendências Atuais</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Pendências em aberto..." {...field} value={field.value || ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="relevantIncidents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incidentes Relevantes (Resumo)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Resumo de incidentes importantes..." {...field} value={field.value || ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="technicalDecisions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decisões Técnicas Importantes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Decisões técnicas relevantes..." {...field} value={field.value || ""} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={createClient.isPending || updateClient.isPending}>
              {createClient.isPending || updateClient.isPending ? "Salvando..." : isEditing ? "Atualizar Cliente" : "Criar Cliente"}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Form >
    </DialogContent >
  );
}

export default function Clients() {
  const { data: clients, isLoading } = useClients();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.contact?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Clientes</h1>
            <p className="text-muted-foreground mt-2">Gerencie seus clientes e documentos.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Cliente
              </Button>
            </DialogTrigger>
            <ClientFormDialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} />
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-10 max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients?.map((client) => (
              <div
                key={client.id}
                className="group bg-card hover:bg-card/50 border border-border/50 hover:border-primary/50 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/5 text-primary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingClient(client)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">
                        Ver Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>

                <h3 className="text-xl font-bold font-display text-foreground mb-1">{client.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{client.description || client.notes || "Sem descrição"}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{client.contact || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{client.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{client.phone || "N/A"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingClient && (
          <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
            <ClientFormDialog
              client={editingClient}
              isOpen={!!editingClient}
              onOpenChange={(open) => !open && setEditingClient(null)}
            />
          </Dialog>
        )}
      </div>
    </Layout>
  );
}
