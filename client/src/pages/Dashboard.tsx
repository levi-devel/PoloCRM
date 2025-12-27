import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/ui/stat-card";
import { useProjects } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useAlerts } from "@/hooks/use-alerts";
import { useUsers } from "@/hooks/use-users";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import {
  FolderOpen,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TrendPeriod = 'week' | 'month' | 'year';

export default function Dashboard() {
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: users } = useUsers();
  const { data: alerts } = useAlerts();

  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("all");
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week');

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats', selectedProjectId, selectedTechnicianId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId !== "all") {
        params.append("projectId", selectedProjectId);
      }
      if (selectedTechnicianId !== "all") {
        params.append("technicianId", selectedTechnicianId);
      }
      const res = await fetch(`/api/dashboard/stats?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });

  // Fetch completion trend
  const { data: completionTrend = [] } = useQuery({
    queryKey: ['/api/dashboard/completion-trend', selectedProjectId, selectedTechnicianId, trendPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId !== "all") {
        params.append("projectId", selectedProjectId);
      }
      if (selectedTechnicianId !== "all") {
        params.append("technicianId", selectedTechnicianId);
      }
      params.append("period", trendPeriod);
      const res = await fetch(`/api/dashboard/completion-trend?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch completion trend");
      return res.json();
    },
  });

  const activeProjects = projects?.filter(p => p.status === "Ativo").length || 0;
  const completedProjects = projects?.filter(p => p.status === "Concluído").length || 0;
  const totalClients = clients?.length || 0;
  const pendingAlerts = alerts?.filter(a => !a.resolved).length || 0;

  // Stats from API
  const totalCards = dashboardStats?.totalCards || 0;
  const completedThisMonth = dashboardStats?.completedThisMonth || 0;
  const completedThisYear = dashboardStats?.completedThisYear || 0;
  const overdueSLA = dashboardStats?.overdueSLA || 0;

  // Mock data for project status chart
  const projectStatusData = [
    { name: 'Ativo', value: activeProjects || 5, color: 'hsl(var(--primary))' },
    { name: 'Concluído', value: completedProjects || 3, color: '#10b981' },
    { name: 'Pausado', value: projects?.filter(p => p.status === "Pausado").length || 1, color: '#f59e0b' },
  ];

  const recentActivity = alerts?.slice(0, 5) || [];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard de Projetos</h1>
          <p className="text-muted-foreground mt-2">Veja volume de cards, concluídos no mês/ano, gargalos e alertas.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Projeto</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Período</label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground">Técnico</label>
            <Select value={selectedTechnicianId} onValueChange={setSelectedTechnicianId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione técnico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="ml-auto">
            Exportar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total de Cards"
            value={totalCards}
            icon={FolderOpen}
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            label="Concluídos (mês)"
            value={completedThisMonth}
            icon={CheckCircle2}
            trend="+8%"
            trendUp={true}
            className="border-green-200 bg-green-50/30"
          />
          <StatCard
            label="Concluídos (ano)"
            value={completedThisYear}
            icon={Calendar}
            trend="YTD"
            trendUp={true}
          />
          <StatCard
            label="Atrasados / SLA"
            value={overdueSLA}
            icon={AlertTriangle}
            trend="+2"
            trendUp={false}
            className={overdueSLA > 0 ? "border-orange-200 bg-orange-50/30" : ""}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Evolution Chart */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Evolução de Conclusões</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Concluídos por {trendPeriod === 'week' ? 'semana' : trendPeriod === 'month' ? 'mês' : 'ano'} (últimos 12 períodos)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={trendPeriod === 'week' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTrendPeriod('week')}
                    >
                      Semanal
                    </Button>
                    <Button
                      variant={trendPeriod === 'month' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTrendPeriod('month')}
                    >
                      Mensal
                    </Button>
                    <Button
                      variant={trendPeriod === 'year' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTrendPeriod('year')}
                    >
                      Anual
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completionTrend}>
                    <defs>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="period"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: 'hsl(var(--background))'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle>Distribuição de Status do Projeto</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40}>
                      {projectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <div>
            <Card className="shadow-sm border-border/60 h-full">
              <CardHeader>
                <CardTitle>Alertas Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Nenhum alerta ativo</div>
                  ) : (
                    recentActivity.map((alert) => (
                      <div key={alert.id} className="flex gap-4 items-start p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className={cn(
                          "w-2 h-2 mt-2 rounded-full flex-shrink-0",
                          alert.severity === "Crítico" ? "bg-red-500" :
                            alert.severity === "Aviso" ? "bg-orange-500" : "bg-blue-500"
                        )} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {alert.createdAt ? format(new Date(alert.createdAt), 'dd/MM HH:mm') : 'Agora mesmo'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

