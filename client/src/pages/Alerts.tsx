import { useAlerts, useMarkAlertAsRead, useMarkAllAlertsAsRead } from "@/hooks/use-alerts";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Alerts() {
    const [, setLocation] = useLocation();
    const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

    const { data: alerts, isLoading } = useAlerts();
    const markAsRead = useMarkAlertAsRead();
    const markAllAsRead = useMarkAllAlertsAsRead();

    const filteredAlerts = alerts?.filter(alert => {
        if (filter === "unread") return !alert.lido;
        if (filter === "read") return alert.lido;
        return true;
    }) || [];

    const handleAlertClick = (alert: any) => {
        // Marcar como lido
        if (!alert.lido) {
            markAsRead.mutate(alert.id);
        }

        // Navegar para o recurso relacionado
        if (alert.id_cartao && alert.id_projeto) {
            setLocation(`/projects/${alert.id_projeto}`);
        } else if (alert.id_etapa_polo) {
            // Navegar para Polo Project
            setLocation(`/polo-project`);
        } else if (alert.id_projeto) {
            setLocation(`/projects/${alert.id_projeto}`);
        }
    };

    return (
        <Layout>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Bell className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold font-display text-foreground">Alertas</h1>
                            <p className="text-muted-foreground mt-2">Notificações e atribuições de tarefas</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => markAllAsRead.mutate()}
                        variant="outline"
                        disabled={!alerts?.some(a => !a.lido)}
                    >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Marcar Todos como Lidos
                    </Button>
                </div>

                {/* Filtros */}
                <div className="flex gap-2">
                    <Button
                        variant={filter === "all" ? "default" : "outline"}
                        onClick={() => setFilter("all")}
                    >
                        Todos ({alerts?.length || 0})
                    </Button>
                    <Button
                        variant={filter === "unread" ? "default" : "outline"}
                        onClick={() => setFilter("unread")}
                    >
                        Não Lidos ({alerts?.filter(a => !a.lido).length || 0})
                    </Button>
                    <Button
                        variant={filter === "read" ? "default" : "outline"}
                        onClick={() => setFilter("read")}
                    >
                        Lidos ({alerts?.filter(a => a.lido).length || 0})
                    </Button>
                </div>

                {/* Lista de Alertas */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <Card className="border-border/50 rounded-xl">
                            <CardContent className="py-12 text-center text-muted-foreground">
                                Nenhum alerta encontrado
                            </CardContent>
                        </Card>
                    ) : (
                        filteredAlerts.map((alert) => (
                            <Card
                                key={alert.id}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-md border-border/50 rounded-xl",
                                    !alert.lido && "bg-primary/5 border-primary/30"
                                )}
                                onClick={() => handleAlertClick(alert)}
                            >
                                <CardContent className="py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant={alert.lido ? "secondary" : "default"}>
                                                    {alert.tipo}
                                                </Badge>
                                                {!alert.lido && (
                                                    <span className="w-2 h-2 bg-primary rounded-full" />
                                                )}
                                            </div>
                                            <p className="text-sm font-medium mb-1">{alert.mensagem}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {alert.criado_em ? new Date(alert.criado_em).toLocaleString("pt-BR") : "Data não disponível"}
                                            </p>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
}
