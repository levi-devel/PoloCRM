import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectBoard from "@/pages/ProjectBoard";
import Clients from "@/pages/Clients";
import Templates from "@/pages/Templates";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login handled by useAuth or auth-utils, but here we show landing or redirect
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function LoginPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Redirect to="/" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background to-background/50 pointer-events-none" />
      
      <div className="relative z-10 text-center space-y-8 p-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-foreground">
            Dev<span className="text-primary">CRM</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Manage development projects, clients, and alerts with a tool built for modern engineering teams.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/api/login">
            <button className="px-8 py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-200">
              Sign In with Replit
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/projects">
        <ProtectedRoute component={Projects} />
      </Route>
      <Route path="/projects/:id">
        <ProtectedRoute component={ProjectBoard} />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={Clients} />
      </Route>
      <Route path="/templates">
        <ProtectedRoute component={Templates} />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
