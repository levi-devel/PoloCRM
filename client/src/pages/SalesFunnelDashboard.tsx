import { Layout } from "@/components/layout/Layout";
import { useSalesFunnelStats } from "@/hooks/use-sales-funnel-stats";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";

export default function SalesFunnelDashboard() {
    const { data: stats, isLoading } = useSalesFunnelStats();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value / 100);
    };

    if (isLoading || !stats) {
        return (
            <Layout>
                <div className="animate-pulse space-y-6">
                    <div className="h-32 bg-muted/20 rounded-2xl" />
                    <div className="grid grid-cols-2 gap-6">
                        <div className="h-96 bg-muted/20 rounded-2xl" />
                        <div className="h-96 bg-muted/20 rounded-2xl" />
                    </div>
                </div>
            </Layout>
        );
    }

    const maxCount = Math.max(...stats.columnStats.map((c: any) => c.count));

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                    <h1 className="text-3xl font-bold font-display mb-2">📊 Dashboard Funil de Vendas</h1>
                    <p className="text-muted-foreground">
                        Análise completa do pipeline de vendas • <strong>Total: {formatCurrency(stats.totalValue)}</strong>
                    </p>
                </Card>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Funnel Stages */}
                    <Card className="p-6">
                        <h2 className="text-lg font-bold mb-4">Estágios do Funil</h2>
                        <div className="space-y-3">
                            {stats.columnStats.map((col: any, index: number) => {
                                const colors = [
                                    'bg-blue-50 border-blue-500',
                                    'bg-green-50 border-green-500',
                                    'bg-orange-50 border-orange-500',
                                    'bg-red-50 border-red-500'
                                ];
                                return (
                                    <div
                                        key={col.columnId}
                                        className={`${colors[index]} border-l-4 rounded-lg p-4 hover:scale-[1.02] transition-all cursor-pointer`}
                                    >
                                        <div className="font-semibold text-sm mb-2">{col.columnName}</div>
                                        <div className="flex justify-between items-center">
                                            <div className="text-2xl font-bold">{col.count}</div>
                                            <div className="text-sm bg-white/70 px-2 py-1 rounded">
                                                {formatCurrency(col.totalValue)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Right: Charts & Metrics */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Bar Chart */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold mb-6 pb-4 border-b">Distribuição por Estágio</h2>
                            <div className="flex items-end gap-4 h-64">
                                {stats.columnStats.map((col: any, index: number) => {
                                    const heightPercent = maxCount > 0 ? (col.count / maxCount) * 100 : 0;
                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                                    return (
                                        <div key={col.columnId} className="flex-1 flex flex-col items-center gap-2">
                                            <div
                                                className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                                                style={{
                                                    height: `${heightPercent}%`,
                                                    backgroundColor: colors[index],
                                                    minHeight: col.count > 0 ? '20px' : '0'
                                                }}
                                            />
                                            <div className="text-xs text-center text-muted-foreground font-medium">
                                                {col.columnName.split(' ')[0]}
                                            </div>
                                            <div className="text-sm font-bold">{col.count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Key Metrics */}
                        <Card className="p-6">
                            <h2 className="text-lg font-bold mb-6 pb-4 border-b">Indicadores Principais</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-muted/30 p-4 rounded-lg text-center">
                                    <div className="text-xs text-muted-foreground mb-2">Total de Negócios</div>
                                    <div className="text-2xl font-bold">{stats.totalDeals}</div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg text-center">
                                    <div className="text-xs text-muted-foreground mb-2">Valor Total</div>
                                    <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg text-center">
                                    <div className="text-xs text-muted-foreground mb-2">Taxa de Conversão</div>
                                    <div className="text-2xl font-bold flex items-center justify-center gap-2">
                                        {stats.conversionRate.toFixed(1)}%
                                        {stats.conversionRate > 50 ? (
                                            <TrendingUp className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <TrendingDown className="w-5 h-5 text-orange-500" />
                                        )}
                                    </div>
                                </div>
                                <div className="bg-muted/30 p-4 rounded-lg text-center">
                                    <div className="text-xs text-muted-foreground mb-2">Valor Médio</div>
                                    <div className="text-2xl font-bold">{formatCurrency(stats.averageValue)}</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Details Table */}
                <Card className="p-6">
                    <h2 className="text-lg font-bold mb-4">📋 Detalhes de Negócios</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Empresa</th>
                                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Contato</th>
                                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Proposta</th>
                                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Valor</th>
                                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Data Envio</th>
                                    <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.allCards.map((card: any) => {
                                    const column = stats.columnStats.find((c: any) => c.columnId === card.columnId);
                                    return (
                                        <tr key={card.id} className="border-b hover:bg-muted/20 transition-colors">
                                            <td className="p-3">
                                                <strong>{card.clientName}</strong>
                                                {card.cnpj && <div className="text-xs text-muted-foreground">CNPJ: {card.cnpj}</div>}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {card.contactName && <div>{card.contactName}</div>}
                                                {card.phone && <div className="text-xs text-muted-foreground">{card.phone}</div>}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {card.proposalNumber ? `#${card.proposalNumber}` : '-'}
                                            </td>
                                            <td className="p-3">
                                                <strong className="text-green-600">{formatCurrency(card.value || 0)}</strong>
                                            </td>
                                            <td className="p-3 text-sm">
                                                {card.sendDate ? format(new Date(card.sendDate), 'dd/MM/yyyy') : '-'}
                                            </td>
                                            <td className="p-3">
                                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                    {column?.columnName || 'Ativo'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </Layout>
    );
}
