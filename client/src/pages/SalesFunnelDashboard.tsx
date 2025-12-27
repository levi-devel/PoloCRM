import { Layout } from "@/components/layout/Layout";
import { useSalesFunnelStats } from "@/hooks/use-sales-funnel-stats";
import { Card } from "@/components/ui/card";
import { BarChart3, Calendar } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
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

    const safeFormatDate = (dateValue: any, formatStr: string) => {
        if (!dateValue) return '-';
        try {
            // If it's a date-only string "YYYY-MM-DD", parse components manually to avoid TZ shifts
            if (typeof dateValue === 'string') {
                const matches = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (matches && !formatStr.includes('H') && !formatStr.includes('m')) {
                    const [_, y, m, d] = matches;
                    const localDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                    return format(localDate, formatStr, { locale: ptBR });
                }
            }

            const d = new Date(dateValue);
            if (isNaN(d.getTime())) return '-';

            // For date-only display from Date objects, use UTC parts to avoid shift
            if (!formatStr.includes('H') && !formatStr.includes('m')) {
                const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
                return format(utcDate, formatStr, { locale: ptBR });
            }

            return format(d, formatStr, { locale: ptBR });
        } catch (e) {
            return '-';
        }
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
                <div className="animate-pulse space-y-6 p-8">
                    <div className="h-24 bg-muted/20 rounded-2xl" />
                    <div className="h-16 bg-muted/20 rounded-2xl" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="h-96 bg-muted/20 rounded-2xl" />
                        <div className="lg:col-span-2 space-y-6">
                            <div className="h-48 bg-muted/20 rounded-2xl" />
                            <div className="h-48 bg-muted/20 rounded-2xl" />
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const maxCount = Math.max(...stats.columnStats.map((c: any) => c.count), 1);

    const stageColors = [
        { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
        { bg: 'bg-green-50', text: 'text-green-700', border: 'border-l-green-500' },
        { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-l-orange-500' },
        { bg: 'bg-red-50', text: 'text-red-700', border: 'border-l-red-500' },
    ];

    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <Layout>
            <div className="p-8 max-w-[1400px] mx-auto space-y-6 bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-800">Dashboard Funil de Vendas</h1>
                    </div>
                    <p className="text-sm text-gray-500">
                        Análise completa do pipeline de vendas • Total: <span className="font-semibold text-gray-700">{formatCurrency(stats.totalValue)}</span>
                    </p>
                </div>

                {/* Filter Section */}
                <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <h3 className="font-semibold text-gray-700">Filtrar por Período</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {(['all', 'week', 'month', 'year', 'custom'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${filterType === type
                                    ? "bg-red-500 text-white shadow-md"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {type === 'all' && 'Todos'}
                                {type === 'week' && 'Esta Semana'}
                                {type === 'month' && 'Este Mês'}
                                {type === 'year' && 'Este Ano'}
                                {type === 'custom' && 'Período Personalizado'}
                            </button>
                        ))}
                    </div>

                    {filterType === 'custom' && (
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-600">De:</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-600">Até:</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="border border-gray-300 px-3 py-1.5 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                        </div>
                    )}
                </Card>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Funnel Stages */}
                    <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                        <h3 className="font-bold text-gray-800 mb-6">Estágios do Funil</h3>
                        <div className="space-y-4">
                            {stats.columnStats.map((col: any, index: number) => {
                                const colorScheme = stageColors[index % stageColors.length];
                                return (
                                    <div
                                        key={col.id_coluna}
                                        className={`${colorScheme.bg} border-l-4 ${colorScheme.border} rounded-lg p-4`}
                                    >
                                        <div className={`text-sm font-medium ${colorScheme.text} mb-2`}>
                                            {col.columnName}
                                        </div>
                                        <div className="flex items-baseline justify-between">
                                            <div className={`text-3xl font-bold ${colorScheme.text}`}>
                                                {col.count}
                                            </div>
                                            <div className={`text-sm font-semibold ${colorScheme.text}`}>
                                                {formatCurrency(col.totalValue)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Distribution Chart */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6">Distribuição por Estágio</h3>
                            <div className="flex items-end justify-around gap-4" style={{ height: '256px' }}>
                                {stats.columnStats.map((col: any, index: number) => {
                                    const heightPx = maxCount > 0 ? Math.floor((col.count / maxCount) * 200) : 0;
                                    return (
                                        <div key={col.id_coluna} className="flex flex-col items-center gap-3 flex-1 max-w-[120px]">
                                            <div
                                                className="w-full rounded-t-lg transition-all duration-500 shadow-sm"
                                                style={{
                                                    height: `${Math.max(heightPx, col.count > 0 ? 30 : 0)}px`,
                                                    backgroundColor: chartColors[index % chartColors.length],
                                                }}
                                            />
                                            <div className="text-xs text-center text-gray-600 font-medium leading-tight">
                                                {col.columnName}
                                            </div>
                                            <div className="text-lg font-bold text-gray-800">{col.count}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Key Indicators */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-sm">
                            <h3 className="font-bold text-gray-800 mb-6">Indicadores Principais</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-2">Total de Negócios</div>
                                    <div className="text-4xl font-bold text-gray-800">{stats.totalDeals}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-2">Valor Total</div>
                                    <div className="text-3xl font-bold text-gray-800">{formatCurrency(stats.totalValue)}</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-2">Taxa de Conversão</div>
                                    <div className="text-4xl font-bold text-gray-800">
                                        {stats.conversionRate || 0}%
                                        <span className="text-lg ml-2">📈</span>
                                    </div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 rounded-lg">
                                    <div className="text-sm text-gray-500 mb-2">Valor Médio</div>
                                    <div className="text-3xl font-bold text-gray-800">{formatCurrency(stats.averageValue)}</div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Details Table */}
                <Card className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-gray-400">📋</span>
                            Detalhes de Negócios
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Empresa</th>
                                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Contato</th>
                                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Proposta</th>
                                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Valor</th>
                                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Data Envio</th>
                                    <th className="text-left p-3 text-xs font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.allCards.map((card: any) => {
                                    const column = stats.columnStats.find((c: any) => c.id_coluna === card.id_coluna);
                                    return (
                                        <tr key={card.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="p-3">
                                                <div className="font-semibold text-gray-800">{card.nome_cliente}</div>
                                                {card.cnpj && <div className="text-xs text-gray-500">CNPJ: {card.cnpj}</div>}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700">
                                                {card.nome_contato && <div>{card.nome_contato}</div>}
                                                {card.telefone && <div className="text-xs text-gray-500">{card.telefone}</div>}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700">
                                                {card.numero_proposta ? `#${card.numero_proposta}` : '-'}
                                            </td>
                                            <td className="p-3">
                                                <span className="font-semibold text-green-600">{formatCurrency(card.valor || 0)}</span>
                                            </td>
                                            <td className="p-3 text-sm text-gray-700">
                                                {safeFormatDate(card.data_envio, 'dd/MM/yyyy')}
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
