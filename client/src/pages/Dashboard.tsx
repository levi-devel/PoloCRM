import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/ui/stat-card";
import { useProjects } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { useAlerts } from "@/hooks/use-alerts";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  FolderOpen, 
  Users, 
  AlertTriangle, 
  CheckCircle2,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { data: projects } = useProjects();
  const { data: clients } = useClients();
  const { data: alerts } = useAlerts();

  const activeProjects = projects?.filter(p => p.status === "Ativo").length || 0;
  const completedProjects = projects?.filter(p => p.status === "Concluído").length || 0;
  const totalClients = clients?.length || 0;
  const pendingAlerts = alerts?.filter(a => !a.resolved).length || 0;

  // Mock data for charts if no real data yet
  const projectStatusData = [
    { name: 'Active', value: activeProjects || 5, color: 'hsl(var(--primary))' },
    { name: 'Completed', value: completedProjects || 3, color: '#10b981' },
    { name: 'Paused', value: projects?.filter(p => p.status === "Pausado").length || 1, color: '#f59e0b' },
  ];

  const recentActivity = alerts?.slice(0, 5) || [];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of your development projects and alerts.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Active Projects" 
            value={activeProjects} 
            icon={FolderOpen}
            trend="+12%"
            trendUp={true}
          />
          <StatCard 
            label="Total Clients" 
            value={totalClients} 
            icon={Users}
            trend="+4%"
            trendUp={true}
          />
          <StatCard 
            label="Pending Alerts" 
            value={pendingAlerts} 
            icon={AlertTriangle}
            trend="-2%"
            trendUp={true}
            className={pendingAlerts > 0 ? "border-red-200 bg-red-50/30" : ""}
          />
          <StatCard 
            label="Completed" 
            value={completedProjects} 
            icon={CheckCircle2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-sm border-border/60">
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStatusData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--muted)/0.5)'}}
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

          <div>
            <Card className="shadow-sm border-border/60 h-full">
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">No active alerts</div>
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
                              {alert.createdAt ? format(new Date(alert.createdAt), 'MMM d, h:mm a') : 'Just now'}
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
