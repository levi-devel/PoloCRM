import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  UserCog,
  TrendingUp,
  BarChart3,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { canViewMenu, type UserRole } from "@/lib/permission-utils";


const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Projetos", icon: FolderKanban, href: "/projects" },
  { label: "Polo Project", iconImage: "/Ícones/project-management.png", href: "/polo-project" },
  { label: "Funil de Vendas", icon: TrendingUp, href: "/sales-funnel" },
  { label: "Dashboard Funil", icon: BarChart3, href: "/sales-funnel/dashboard" },
  { label: "Clientes", icon: Users, href: "/clients" },
  { label: "Usuários", icon: UserCog, href: "/users" },
  { label: "Modelos de Formulário", icon: Settings, href: "/form-templates" },
  { label: "Alertas", icon: Bell, href: "/alerts" },
];

export function Sidebar() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Filter menu items based on user role
  const visibleNavItems = navItems.filter(item =>
    canViewMenu(user?.role as UserRole, item.label)
  );

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações frontend
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter no mínimo 6 caracteres",
        variant: "destructive"
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não conferem",
        variant: "destructive"
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Falha ao trocar senha");
      }

      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!"
      });

      // Limpar formulário e fechar dialog
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setIsPasswordDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao trocar senha",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <img
            src="/LOGO PADRÃO POLO.png"
            alt="Polo CRM"
            className="h-12 w-auto object-contain"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Gestão de Projetos</p>
      </div>

      <div className="flex-1 px-4 space-y-2">
        {visibleNavItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {item.iconImage ? (
                  <img
                    src={item.iconImage}
                    alt={item.label}
                    className={cn("w-5 h-5 object-contain", isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")}
                  />
                ) : item.icon ? (
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                ) : null}
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <img
            src={user?.profileImageUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}`}
            alt="Profile"
            className="w-10 h-10 rounded-full border border-border"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPasswordDialogOpen(true)}
            title="Trocar Senha"
          >
            <Lock className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => logout()} title="Sair">
            <LogOut className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-card h-screen fixed left-0 top-0 z-20">
        <NavContent />
      </div>

      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shadow-md">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Senha</DialogTitle>
            <DialogDescription>
              Altere sua senha de acesso ao sistema
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Digite sua senha atual"
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Digite a nova senha (mínimo 6 caracteres)"
                  disabled={isChangingPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Digite a nova senha novamente"
                  disabled={isChangingPassword}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsPasswordDialogOpen(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                  });
                }}
                disabled={isChangingPassword}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? "Alterando..." : "Alterar Senha"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
