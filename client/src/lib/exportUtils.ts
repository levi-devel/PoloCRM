import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata valor monetário para exportação (centavos para reais)
 */
export function formatCurrencyForExport(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value / 100);
}

/**
 * Formata data para exportação
 */
export function formatDateForExport(dateValue: any): string {
    if (!dateValue) return '-';

    try {
        // Handle date-only strings "YYYY-MM-DD" to avoid TZ shifts
        if (typeof dateValue === 'string') {
            const matches = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (matches) {
                const [_, y, m, d] = matches;
                const localDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                return format(localDate, 'dd/MM/yyyy', { locale: ptBR });
            }
        }

        const d = new Date(dateValue);
        if (isNaN(d.getTime())) return '-';

        // Use UTC parts for date-only display to avoid shift
        const utcDate = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
        return format(utcDate, 'dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
        return '-';
    }
}

/**
 * Escapa aspas duplas para CSV
 */
function escapeCSVValue(value: any): string {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Se contém vírgula, quebra de linha ou aspas duplas, envolve em aspas
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

/**
 * Exporta dados para CSV
 */
export function exportToCSV(data: any[][], filename: string): void {
    const csvContent = data
        .map(row => row.map(cell => escapeCSVValue(cell)).join(','))
        .join('\n');

    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Faz download de um arquivo
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
