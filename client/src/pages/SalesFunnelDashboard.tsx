import { Layout } from "@/components/layout/Layout";
import { useSalesFunnelStats } from "@/hooks/use-sales-funnel-stats";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { useState } from "react";

type FilterType = 'all' | 'week' | 'month' | 'year' | 'custom';

export default function SalesFunnelDashboard() {
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    // Calculate date range based on filter type
    const getDateRange = (): { startDate?: Date; endDate?: Date } => {
        const now = new Date();

        switch (filterType) {
            case 'week':
                return {
                    startDate: startOfWeek(now, { weekStartsOn: 0 }),
                    endDate: endOfWeek(now, { weekStartsOn: 0 })
                };
            case 'month':
                return {
                    startDate: startOfMonth(now),
                    endDate: endOfMonth(now)
                };
            case 'year':
                return {
                    startDate: startOfYear(now),
                    endDate: endOfYear(now)
                };
            case 'custom':
                return {
                    startDate: customStartDate ? new Date(customStartDate) : undefined,
                    endDate: customEndDate ? new Date(customEndDate) : undefined
                };
            default:
                return {};
        }
    };

    const { startDate, endDate } = getDateRange();
    const { data: stats, isLoading } = useSalesFunnelStats(startDate, endDate);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value / 100);
    };

    const getStatusColor = (columnName: string) => {
        const normalizedName = columnName.toLowerCase();
        if (normalizedName.includes('envio') || normalizedName.includes('proposta')) {
            return 'bg-blue-100 text-blue-800';
        } else if (normalizedName.includes('fechado')) {
            return 'bg-green-100 text-green-800';
        } else if (normalizedName.includes('recusado')) {
            return 'bg-yellow-100 text-yellow-800';
        } else if (normalizedName.includes('cancelamento')) {
            return 'bg-red-100 text-red-800';
        }
        return 'bg-gray-100 text-gray-800';
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

                {/* Period Filter */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Filtrar por Período</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Filter Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFilterType('all')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filterType === 'all'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setFilterType('week')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filterType === 'week'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                Esta Semana
                            </button>
                            <button
                                onClick={() => setFilterType('month')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filterType === 'month'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                Este Mês
                            </button>
                            <button
                                onClick={() => setFilterType('year')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filterType === 'year'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                Este Ano
                            </button>
                            <button
                                onClick={() => setFilterType('custom')}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${filterType === 'custom'
                                    ? 'bg-primary text-primary-foreground shadow-md'
                                    : 'bg-muted/50 hover:bg-muted'
                                    }`}
                            >
                                Período Personalizado
                            </button>
                        </div>

                        {/* Custom Date Range Inputs */}
                        {filterType === 'custom' && (
                            <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium mb-2">Data Inicial</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-sm font-medium mb-2">Data Final</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
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
                                                {col.columnName}
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
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(column?.columnName || '')}`}>
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
