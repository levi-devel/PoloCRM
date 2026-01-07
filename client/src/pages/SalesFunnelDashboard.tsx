import { Layout } from "@/components/layout/Layout";
import { useSalesFunnelStats } from "@/hooks/use-sales-funnel-stats";
import { Card } from "@/components/ui/card";
import { BarChart3, Calendar, Download, FileText, Table, TrendingUp } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useRef } from "react";
import { exportToCSV, formatCurrencyForExport, formatDateForExport } from "@/lib/exportUtils";
import { exportDashboardToPDF } from "@/lib/pdfExportUtils";

type FilterType = 'all' | 'week' | 'month' | 'year' | 'custom';

export default function SalesFunnelDashboard() {
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const chartRef = useRef<HTMLDivElement>(null);

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

    const getFilterDescription = (): string => {
        switch (filterType) {
            case 'all':
                return 'Todos os registros';
            case 'week':
                return 'Esta Semana';
            case 'month':
                return 'Este Mês';
            case 'year':
                return 'Este Ano';
            case 'custom':
                if (customStartDate && customEndDate) {
                    return `${customStartDate} até ${customEndDate}`;
                }
                return 'Período Personalizado';
            default:
                return 'Todos os registros';
        }
    };

    const handleExportCSV = () => {
        if (!stats) return;

        const csvData: any[][] = [
            [`Dashboard Funil de Vendas - Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`],
            [`Período: ${getFilterDescription()}`],
            [], // Linha vazia
            ['Empresa', 'CNPJ', 'Contato', 'Telefone', 'Proposta', 'Valor', 'Data Envio', 'Status']
        ];

        stats.allCards.forEach((card: any) => {
            const column = stats.columnStats.find((c: any) => c.id_coluna === card.id_coluna);
            csvData.push([
                card.nome_cliente,
                card.cnpj || '',
                card.nome_contato || '',
                card.telefone || '',
                card.numero_proposta ? `#${card.numero_proposta}` : '',
                formatCurrencyForExport(card.valor || 0),
                formatDateForExport(card.data_envio),
                column?.columnName || ''
            ]);
        });

        const filename = `funil-vendas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
        exportToCSV(csvData, filename);
    };

    const handleExportPDF = async () => {
        if (!stats) return;

        await exportDashboardToPDF(
            stats,
            {
                filterType,
                customStartDate,
                customEndDate
            },
            'chart-distribution',
            '/LOGO PADRÃO POLO.png'
        );
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

    const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    return (
        <Layout>
            <div className="p-8 max-w-[1400px] mx-auto space-y-6 bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-800">Dashboard Funil de Vendas</h1>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm font-medium text-sm"
                            >
                                <FileText className="w-4 h-4" />
                                Exportar PDF
                            </button>
                            <button
                                onClick={handleExportCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm font-medium text-sm"
                            >
                                <Table className="w-4 h-4" />
                                Exportar CSV
                            </button>
                        </div>
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

                {/* Main Content */}
                <div className="space-y-6">
                    {/* KPI Cards - Moved to Top */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total de Negócios */}
                        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Total de Negócios</div>
                                    <div className="text-3xl font-bold text-gray-800">{stats.totalDeals}</div>
                                    <div className="text-xs text-gray-400 mt-1">Quantidade no período</div>
                                </div>
                                <div className="text-gray-400">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                            </div>
                        </Card>

                        {/* Valor Total */}
                        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Valor Total</div>
                                    <div className="text-2xl font-bold text-gray-800">{formatCurrency(stats.totalValue)}</div>
                                    <div className="text-xs text-gray-400 mt-1">Somatório de valores</div>
                                </div>
                                <div className="text-gray-400">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                            </div>
                        </Card>

                        {/* Taxa de Conversão */}
                        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Taxa de Conversão</div>
                                    <div className="text-3xl font-bold text-gray-800">{stats.conversionRate || 0}%</div>
                                    <div className="text-xs text-gray-400 mt-1">Fechados / total</div>
                                </div>
                                <div className="text-gray-400">
                                    <span className="text-2xl">%</span>
                                </div>
                            </div>
                        </Card>

                        {/* Ticket Médio */}
                        <Card className="p-5 bg-white border border-gray-100 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Ticket Médio</div>
                                    <div className="text-2xl font-bold text-gray-800">{formatCurrency(stats.averageValue)}</div>
                                    <div className="text-xs text-gray-400 mt-1">Valor médio por negócio</div>
                                </div>
                                <div className="text-gray-400">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Charts Side by Side - Modern Design */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Distribution by Stage Chart */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-8">
                                <h3 className="font-bold text-gray-800">Distribuição por Estágio</h3>
                                <p className="text-sm text-gray-500">Volume por etapa do funil</p>
                            </div>
                            <div id="chart-distribution" ref={chartRef} className="flex items-end justify-around gap-2 mb-2" style={{ height: '200px' }}>
                                {stats.columnStats.map((col: any) => {
                                    const heightPx = maxCount > 0 ? Math.floor((col.count / maxCount) * 160) : 0;

                                    return (
                                        <div key={col.id_coluna} className="flex flex-col items-center gap-3 flex-1 group">
                                            <div className="relative flex flex-col items-center justify-end h-full w-full">
                                                <div
                                                    className="w-4 rounded-full transition-all duration-300 hover:bg-red-600 bg-red-500 shadow-sm"
                                                    style={{
                                                        height: `${Math.max(heightPx, col.count > 0 ? 10 : 0)}px`,
                                                    }}
                                                >
                                                    {/* Shine effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-sm font-bold text-gray-700">{col.count}</span>
                                                <div className="text-xs text-center text-gray-500 font-medium leading-tight max-w-[80px] break-words">
                                                    {col.columnName}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Distribution by Contract Type Chart */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-8">
                                <h3 className="font-bold text-gray-800">Distribuição por Tipo de Contrato</h3>
                                <p className="text-sm text-gray-500">Mix de contratos no período</p>
                            </div>
                            <div className="flex items-end justify-around gap-2 mb-2" style={{ height: '200px' }}>
                                {stats.contractTypeStats && stats.contractTypeStats.map((typeData: any) => {
                                    const maxTypeCount = Math.max(...stats.contractTypeStats.map((t: any) => t.count), 1);
                                    const heightPx = maxTypeCount > 0 ? Math.floor((typeData.count / maxTypeCount) * 160) : 0;

                                    return (
                                        <div key={typeData.type} className="flex flex-col items-center gap-3 flex-1 group">
                                            <div className="relative flex flex-col items-center justify-end h-full w-full">
                                                <div
                                                    className="w-4 rounded-full transition-all duration-300 hover:bg-red-600 bg-red-500 shadow-sm"
                                                    style={{
                                                        height: `${Math.max(heightPx, typeData.count > 0 ? 10 : 0)}px`,
                                                    }}
                                                >
                                                    {/* Shine effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-sm font-bold text-gray-700">{typeData.count}</span>
                                                <div className="text-xs text-center text-gray-500 font-medium leading-tight max-w-[80px] break-words">
                                                    {typeData.type}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>

                    {/* Product Charts - New Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Main Products Chart */}
                        <Card className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="mb-8">
                                <h3 className="font-bold text-gray-800">Distribuição por Produto</h3>
                                <p className="text-sm text-gray-500">Produtos ofertados no período</p>
                            </div>
                            <div className="flex items-end justify-around gap-2 mb-2" style={{ height: '200px' }}>
                                {stats.productStats && stats.productStats.map((prod: any) => {
                                    const maxProductCount = Math.max(...stats.productStats.map((p: any) => p.count), 1);
                                    const heightPx = maxProductCount > 0 ? Math.floor((prod.count / maxProductCount) * 160) : 0;

                                    return (
                                        <div key={prod.product} className="flex flex-col items-center gap-3 flex-1 group">
                                            <div className="relative flex flex-col items-center justify-end h-full w-full">
                                                <div
                                                    className="w-4 rounded-full transition-all duration-300 hover:bg-red-600 bg-red-500 shadow-sm"
                                                    style={{
                                                        height: `${Math.max(heightPx, prod.count > 0 ? 10 : 0)}px`,
                                                    }}
                                                >
                                                    {/* Shine effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-sm font-bold text-gray-700">{prod.count}</span>
                                                <div className="text-xs text-center text-gray-500 font-medium leading-tight max-w-[80px] break-words">
                                                    {prod.product}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>

                        {/* Specific Products Chart - Only shown if there are specific products */}
                        {stats.specificProductStats && stats.specificProductStats.length > 0 && (
                            <Card className="p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="mb-8">
                                    <h3 className="font-bold text-gray-800">Derivações de Produtos</h3>
                                    <p className="text-sm text-gray-500">Produtos específicos ofertados</p>
                                </div>
                                <div className="flex items-end justify-around gap-2 mb-2" style={{ height: '200px' }}>
                                    {stats.specificProductStats.map((spec: any) => {
                                        const maxSpecCount = Math.max(...stats.specificProductStats.map((s: any) => s.count), 1);
                                        const heightPx = maxSpecCount > 0 ? Math.floor((spec.count / maxSpecCount) * 160) : 0;

                                        return (
                                            <div key={spec.specificProduct} className="flex flex-col items-center gap-3 flex-1 group">
                                                <div className="relative flex flex-col items-center justify-end h-full w-full">
                                                    <div
                                                        className="w-4 rounded-full transition-all duration-300 hover:bg-red-600 bg-red-500 shadow-sm"
                                                        style={{
                                                            height: `${Math.max(heightPx, spec.count > 0 ? 10 : 0)}px`,
                                                        }}
                                                    >
                                                        {/* Shine effect */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white opacity-20 rounded-full"></div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-sm font-bold text-gray-700">{spec.count}</span>
                                                    <div className="text-xs text-center text-gray-500 font-medium leading-tight max-w-[80px] break-words">
                                                        {spec.specificProduct}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}
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
        </Layout >
    );
}
