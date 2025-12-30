import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrencyForExport, formatDateForExport } from './exportUtils';

interface SalesFunnelStats {
    totalDeals: number;
    totalValue: number;
    conversionRate: number;
    averageValue: number;
    columnStats: Array<{
        id_coluna: number;
        columnName: string;
        count: number;
        totalValue: number;
    }>;
    allCards: Array<{
        id: number;
        nome_cliente: string;
        cnpj?: string;
        nome_contato?: string;
        telefone?: string;
        numero_proposta?: string;
        valor: number;
        data_envio: string;
        id_coluna: number;
    }>;
}

interface FilterInfo {
    filterType: string;
    customStartDate?: string;
    customEndDate?: string;
}

/**
 * Carrega a logo do sistema como imagem base64
 */
async function loadLogoImage(logoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Failed to get canvas context'));
            }
        };

        img.onerror = () => reject(new Error('Failed to load logo'));
        img.src = logoPath;
    });
}

/**
 * Adiciona cabeçalho ao PDF com logo
 */
function addHeaderToPDF(
    doc: jsPDF,
    title: string,
    filterInfo: FilterInfo,
    logoImage: string | null
): number {
    let yPosition = 20;

    // Adiciona logo se disponível
    if (logoImage) {
        try {
            doc.addImage(logoImage, 'PNG', 15, yPosition, 40, 15);
        } catch (e) {
            console.error('Error adding logo to PDF:', e);
        }
    }

    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, logoImage ? 60 : 15, yPosition + 10);

    yPosition += 20;

    // Data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Gerado em: ${now}`, 15, yPosition);

    yPosition += 7;

    // Filtro aplicado
    const filterText = getFilterText(filterInfo);
    doc.text(`Período: ${filterText}`, 15, yPosition);

    yPosition += 10;

    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPosition, 195, yPosition);

    return yPosition + 10;
}

/**
 * Retorna texto descritivo do filtro
 */
function getFilterText(filterInfo: FilterInfo): string {
    switch (filterInfo.filterType) {
        case 'all':
            return 'Todos os registros';
        case 'week':
            return 'Esta Semana';
        case 'month':
            return 'Este Mês';
        case 'year':
            return 'Este Ano';
        case 'custom':
            if (filterInfo.customStartDate && filterInfo.customEndDate) {
                return `${filterInfo.customStartDate} até ${filterInfo.customEndDate}`;
            }
            return 'Período Personalizado';
        default:
            return 'Todos os registros';
    }
}

/**
 * Adiciona indicadores principais ao PDF
 */
function addIndicatorsToPDF(doc: jsPDF, stats: SalesFunnelStats, yPosition: number): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicadores Principais', 15, yPosition);

    yPosition += 8;

    // Background para indicadores
    doc.setFillColor(249, 250, 251);
    doc.rect(15, yPosition, 180, 25, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const indicators = [
        { label: 'Total de Negócios', value: String(stats.totalDeals) },
        { label: 'Valor Total', value: formatCurrencyForExport(stats.totalValue) },
        { label: 'Taxa de Conversão', value: `${stats.conversionRate || 0}%` },
        { label: 'Valor Médio', value: formatCurrencyForExport(stats.averageValue) }
    ];

    const colWidth = 45;
    indicators.forEach((indicator, index) => {
        const x = 15 + (index * colWidth);
        doc.setFont('helvetica', 'normal');
        doc.text(indicator.label, x + 2, yPosition + 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(indicator.value, x + 2, yPosition + 13);
        doc.setFontSize(10);
    });

    return yPosition + 30;
}

/**
 * Adiciona resumo dos estágios ao PDF
 */
function addStagesSummaryToPDF(
    doc: jsPDF,
    columnStats: SalesFunnelStats['columnStats'],
    yPosition: number
): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Estágios do Funil', 15, yPosition);

    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    columnStats.forEach((col) => {
        // Background alternado
        doc.setFillColor(249, 250, 251);
        doc.rect(15, yPosition - 2, 180, 8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.text(col.columnName, 17, yPosition + 3);

        doc.setFont('helvetica', 'normal');
        doc.text(`Quantidade: ${col.count}`, 90, yPosition + 3);
        doc.text(`Valor: ${formatCurrencyForExport(col.totalValue)}`, 135, yPosition + 3);

        yPosition += 10;
    });

    return yPosition + 5;
}

/**
 * Captura e adiciona gráfico ao PDF
 */
async function addChartImageToPDF(
    doc: jsPDF,
    chartElement: HTMLElement | null,
    yPosition: number
): Promise<number> {
    if (!chartElement) return yPosition;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribuição por Estágio', 15, yPosition);

    yPosition += 8;

    try {
        const canvas = await html2canvas(chartElement, {
            backgroundColor: '#ffffff',
            scale: 2
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Verifica se precisa de nova página
        if (yPosition + imgHeight > 270) {
            doc.addPage();
            yPosition = 20;
        }

        doc.addImage(imgData, 'PNG', 15, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
    } catch (e) {
        console.error('Error capturing chart:', e);
        doc.setFontSize(9);
        doc.text('(Gráfico não pôde ser capturado)', 15, yPosition);
        yPosition += 10;
    }

    return yPosition;
}

/**
 * Adiciona tabela de detalhes ao PDF
 */
function addDetailsTableToPDF(
    doc: jsPDF,
    cards: SalesFunnelStats['allCards'],
    columnStats: SalesFunnelStats['columnStats'],
    yPosition: number
): number {
    // Nova página para a tabela
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhes de Negócios', 15, yPosition);

    yPosition += 8;

    // Cabeçalhos da tabela
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition, 180, 7, 'F');

    doc.text('Empresa', 17, yPosition + 5);
    doc.text('Contato', 60, yPosition + 5);
    doc.text('Proposta', 95, yPosition + 5);
    doc.text('Valor', 120, yPosition + 5);
    doc.text('Data', 145, yPosition + 5);
    doc.text('Status', 170, yPosition + 5);

    yPosition += 10;

    // Dados da tabela
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    cards.forEach((card) => {
        // Verifica se precisa de nova página
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
        }

        const column = columnStats.find((c) => c.id_coluna === card.id_coluna);

        // Empresa
        const empresaText = card.nome_cliente.length > 20
            ? card.nome_cliente.substring(0, 20) + '...'
            : card.nome_cliente;
        doc.text(empresaText, 17, yPosition);

        // Contato
        const contatoText = card.nome_contato || '-';
        const contatoShort = contatoText.length > 15
            ? contatoText.substring(0, 15) + '...'
            : contatoText;
        doc.text(contatoShort, 60, yPosition);

        // Proposta
        const proposta = card.numero_proposta ? `#${card.numero_proposta}` : '-';
        doc.text(proposta, 95, yPosition);

        // Valor
        const valor = formatCurrencyForExport(card.valor || 0);
        doc.text(valor, 120, yPosition);

        // Data
        const data = formatDateForExport(card.data_envio);
        doc.text(data, 145, yPosition);

        // Status
        const status = column?.columnName || '-';
        const statusShort = status.length > 12
            ? status.substring(0, 12) + '...'
            : status;
        doc.text(statusShort, 170, yPosition);

        yPosition += 6;
    });

    return yPosition;
}

/**
 * Função principal de exportação para PDF
 */
export async function exportDashboardToPDF(
    stats: SalesFunnelStats,
    filterInfo: FilterInfo,
    chartElementId: string,
    logoPath: string
): Promise<void> {
    const doc = new jsPDF();

    // Carregar logo
    let logoImage: string | null = null;
    try {
        logoImage = await loadLogoImage(logoPath);
    } catch (e) {
        console.warn('Logo could not be loaded, proceeding without it:', e);
    }

    // Adicionar seções ao PDF
    let yPosition = addHeaderToPDF(doc, 'Relatório - Dashboard Funil de Vendas', filterInfo, logoImage);
    yPosition = addIndicatorsToPDF(doc, stats, yPosition);
    yPosition = addStagesSummaryToPDF(doc, stats.columnStats, yPosition);

    // Capturar e adicionar gráfico
    const chartElement = document.getElementById(chartElementId);
    yPosition = await addChartImageToPDF(doc, chartElement, yPosition);

    // Adicionar tabela de detalhes
    addDetailsTableToPDF(doc, stats.allCards, stats.columnStats, yPosition);

    // Salvar PDF
    const filename = `funil-vendas-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    doc.save(filename);
}
