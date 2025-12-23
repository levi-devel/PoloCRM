import { Layout } from "@/components/layout/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Search, UserCog, Mail, Shield, CheckCircle, XCircle, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

// Schema de validação para criar usuário
const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
    role: z.enum(["Admin", "Gestor", "Técnico"]),
    isActive: z.boolean().default(true),
});

// Schema de validação para editar usuário
const editUserSchema = z.object({
    email: z.string().email("Email inválido"),
    firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
    role: z.enum(["Admin", "Gestor", "Técnico"]),
    isActive: z.boolean(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;
type EditUserInput = z.infer<typeof editUserSchema>;

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    createdAt?: Date;
}

export default function Users() {
    const [searchQuery, setSearchQuery] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch users
    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ["/api/users"],
        queryFn: async () => {
            const res = await fetch("/api/users", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch users");
            return res.json();
        },
    });

    // Create user mutation
    const createUser = useMutation({
        mutationFn: async (data: CreateUserInput) => {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to create user");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: "Sucesso", description: "Usuário criado com sucesso" });
            setDialogOpen(false);
            form.reset();
        },
        onError: (error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
    });

    // Update user mutation
    const updateUser = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<User> }) => {
            const res = await fetch(`/api/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to update user");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: "Sucesso", description: "Usuário atualizado" });
            setEditDialogOpen(false);
            setSelectedUser(null);
        },
        onError: (error) => {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        },
    });

    const form = useForm<CreateUserInput>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            role: "Técnico",
            isActive: true,
        },
    });

    const editForm = useForm<EditUserInput>({
        resolver: zodResolver(editUserSchema),
        defaultValues: {
            email: "",
            firstName: "",
            lastName: "",
            password: "",
            role: "Técnico",
            isActive: true,
        },
    });

    const onSubmit = (data: CreateUserInput) => {
        createUser.mutate(data);
    };

    const onEditSubmit = (data: EditUserInput) => {
        if (!selectedUser) return;

        const updates: any = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            role: data.role,
            isActive: data.isActive,
        };

        // Only include password if it was provided
        if (data.password && data.password.length > 0) {
            updates.password = data.password;
        }

        updateUser.mutate({ id: selectedUser.id, updates });
    };

    const toggleUserStatus = (user: User) => {
        updateUser.mutate({
            id: user.id,
            updates: { isActive: !user.isActive },
        });
    };

    const openEditDialog = (user: User) => {
        setSelectedUser(user);
        editForm.reset({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            password: "",
            role: user.role as "Admin" | "Gestor" | "Técnico",
            isActive: user.isActive,
        });
        setEditDialogOpen(true);
    };

    const filteredUsers = users.filter((user) =>
        `${user.firstName} ${user.lastName} ${user.email}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold font-display tracking-tight text-foreground">
                            Usuários
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Gerencie os membros da equipe e suas permissões
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" className="gap-2 shadow-lg hover:shadow-xl transition-shadow">
                                <Plus className="w-5 h-5" />
                                Novo Usuário
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-display text-2xl">Criar Novo Usuário</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="João" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sobrenome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Silva" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="joao@empresa.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Função</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione a função" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Técnico">Técnico</SelectItem>
                                                        <SelectItem value="Gestor">Gestor</SelectItem>
                                                        <SelectItem value="Admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isActive"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">Ativo</FormLabel>
                                                    <div className="text-sm text-muted-foreground">
                                                        Usuário pode acessar o sistema
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setDialogOpen(false)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={createUser.isPending}>
                                            {createUser.isPending ? "Criando..." : "Criar Usuário"}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>

                    {/* Edit User Dialog */}
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle className="font-display text-2xl">Editar Usuário</DialogTitle>
                            </DialogHeader>
                            <Form {...editForm}>
                                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                    <FormField
                                        control={editForm.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="João" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Sobrenome</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Silva" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="joao@empresa.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Senha (deixe em branco para manter atual)</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="••••••" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="role"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Função</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione a função" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Técnico">Técnico</SelectItem>
                                                        <SelectItem value="Gestor">Gestor</SelectItem>
                                                        <SelectItem value="Admin">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={editForm.control}
                                        name="isActive"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-base">Ativo</FormLabel>
                                                    <div className="text-sm text-muted-foreground">
                                                        Usuário pode acessar o sistema
                                                    </div>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setEditDialogOpen(false);
                                                setSelectedUser(null);
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button type="submit" disabled={updateUser.isPending}>
                                            {updateUser.isPending ? "Salvando..." : "Salvar Alterações"}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 text-base"
                    />
                </div>

                {/* Users Grid */}
                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Carregando usuários...
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <UserCog className="w-16 h-16 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground text-lg">
                            {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="group relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                            >
                                {/* Status Badge */}
                                <div className="absolute top-4 right-4">
                                    {user.isActive ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                </div>

                                {/* Avatar */}
                                <div className="mb-4 flex items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-3xl font-bold text-primary font-display">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </span>
                                    </div>
                                </div>

                                {/* User Info */}
                                <div className="text-center space-y-2 mb-4">
                                    <h3 className="text-xl font-bold font-display text-foreground">
                                        {user.firstName} {user.lastName}
                                    </h3>

                                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                        <Mail className="w-4 h-4" />
                                        <span className="truncate">{user.email}</span>
                                    </div>

                                    <div className="flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium text-primary">{user.role}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => openEditDialog(user)}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant={user.isActive ? "outline" : "default"}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => toggleUserStatus(user)}
                                        disabled={updateUser.isPending}
                                    >
                                        {user.isActive ? "Desativar" : "Ativar"}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
