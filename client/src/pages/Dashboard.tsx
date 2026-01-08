import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/ui/stat-card";
import { TechnicianRanking } from "@/components/TechnicianRanking";
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
  Calendar,
  Search,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
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
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [confirmedStartDate, setConfirmedStartDate] = useState<Date | undefined>();
  const [confirmedEndDate, setConfirmedEndDate] = useState<Date | undefined>();

  // Calculate date range based on selected period
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (selectedPeriod === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
    } else if (selectedPeriod === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = now;
    } else if (selectedPeriod === "custom") {
      // Use confirmed dates instead of the ones being edited
      startDate = confirmedStartDate;
      endDate = confirmedEndDate;
    }

    return { startDate, endDate };
  };

  // Handle custom period search
  const handleCustomSearch = () => {
    setConfirmedStartDate(customStartDate);
    setConfirmedEndDate(customEndDate);
  };

  const { startDate, endDate } = getDateRange();

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats', selectedProjectId, selectedTechnicianId, selectedPeriod, confirmedStartDate, confirmedEndDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId !== "all") {
        params.append("projectId", selectedProjectId);
      }
      if (selectedTechnicianId !== "all") {
        params.append("technicianId", selectedTechnicianId);
      }
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
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

  // Fetch project technician stats
  const { data: projectTechnicianStats = [] } = useQuery({
    queryKey: ['/api/dashboard/project-technician-stats', selectedProjectId, confirmedStartDate, confirmedEndDate, selectedPeriod, selectedTechnicianId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId !== "all") {
        params.append("projectId", selectedProjectId);
      }
      if (selectedTechnicianId !== "all") {
        params.append("technicianId", selectedTechnicianId);
      }
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }
      const res = await fetch(`/api/dashboard/project-technician-stats?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project technician stats");
      return res.json();
    },
  });

  // Fetch technician ranking
  const { data: technicianRanking = [] } = useQuery({
    queryKey: ['/api/dashboard/technician-ranking', selectedProjectId, confirmedStartDate, confirmedEndDate, selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedProjectId !== "all") {
        params.append("projectId", selectedProjectId);
      }
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }
      const res = await fetch(`/api/dashboard/technician-ranking?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch technician ranking");
      return res.json();
    },
  });

  const activeProjects = projects?.filter(p => p.status === "Ativo").length || 0;
  const completedProjects = projects?.filter(p => p.status === "Concluído").length || 0;
  const totalClients = clients?.length || 0;
  const pendingAlerts = alerts?.filter(a => !a.resolvido).length || 0;

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
        <div className="space-y-4">
          {/* First Row: Projeto, Período, Técnico, Exportar */}
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
                      {project.nome}
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

          {/* Second Row: Custom Date Range (only visible when period is custom) */}
          {selectedPeriod === "custom" && (
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? (
                        format(customStartDate, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? (
                        format(customEndDate, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      locale={ptBR}
                      disabled={(date) =>
                        customStartDate ? date < customStartDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button
                onClick={handleCustomSearch}
                className="flex items-center gap-2"
                disabled={!customStartDate || !customEndDate}
              >
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total de Cards"
            value={totalCards}
            icon={FolderOpen}
            borderColor="border-l-rose-400"
            iconBgColor="bg-rose-50"
            iconColor="text-rose-500"
          />
          <StatCard
            label="Concluídos (mês)"
            value={completedThisMonth}
            icon={CheckCircle2}
            borderColor="border-l-green-400"
            iconBgColor="bg-green-50"
            iconColor="text-green-500"
          />
          <StatCard
            label="Concluídos (ano)"
            value={completedThisYear}
            icon={Calendar}
            borderColor="border-l-blue-400"
            iconBgColor="bg-blue-50"
            iconColor="text-blue-500"
          />
          <StatCard
            label="Atrasados / SLA"
            value={overdueSLA}
            icon={AlertTriangle}
            borderColor="border-l-orange-400"
            iconBgColor="bg-orange-50"
            iconColor="text-orange-500"
          />
        </div>

        {/* Project Technician Distribution and Ranking */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-display text-foreground">Distribuição e Ranking</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Cards por Técnico por Projeto */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Cards por técnico por projeto
              </h3>
              <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
                {projectTechnicianStats?.map((project: any) => (
                  <Card key={project.id} className="shadow-sm border-border/60 hover:shadow-md transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium flex items-center justify-between">
                        {project.name}
                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          Total: {project.data.reduce((acc: number, item: any) => acc + item.value, 0)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px] pl-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={project.data}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={100}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--muted)/0.3)', radius: 4 }}
                            contentStyle={{
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: 'hsl(var(--background))',
                              fontSize: '12px'
                            }}
                          />
                          <Bar
                            dataKey="value"
                            fill="hsl(var(--primary))"
                            radius={[0, 8, 8, 0]}
                            barSize={16}
                            background={{ fill: 'hsl(var(--muted)/0.2)', radius: 8 }}
                            label={{ position: 'right', fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 'bold' }}
                          >
                            {project.data.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right: Ranking de Carga */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Ranking de carga
              </h3>
              <TechnicianRanking data={technicianRanking} />
            </div>
          </div>
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
                          alert.severidade === "Crítico" ? "bg-red-500" :
                            alert.severidade === "Aviso" ? "bg-orange-500" : "bg-blue-500"
                        )} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{alert.mensagem}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {alert.criado_em ? format(new Date(alert.criado_em), 'dd/MM HH:mm') : 'Agora mesmo'}
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
    </Layout >
  );
}

