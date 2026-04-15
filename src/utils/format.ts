/**
 * Format a number as Colombian Pesos (COP) with thousands separator
 * No decimals, uses dot as thousands separator
 */
export function formatCOP(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return '0';
  return Math.round(value).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format input value in real-time as user types
 * Returns formatted string with dots as thousands separator
 */
export function formatPriceInput(raw: string): string {
  // Remove everything except digits
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Parse formatted price string to number
 */
export function parsePriceInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10);
}

/**
 * Calculate profit per unit
 */
export function calcProfit(salePrice: number, costPrice: number): number {
  return salePrice - costPrice;
}

/**
 * Calculate margin percentage
 */
export function calcMargin(salePrice: number, costPrice: number): number {
  if (costPrice === 0) return 0;
  return ((salePrice - costPrice) / costPrice) * 100;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Export products to CSV compatible with Treinta
 */
export function exportToCSV(products: { name: string; brand: string; salePrice: number; category: string; barcode: string; stock: number }[]): string {
  const headers = ['nombre', 'marca', 'precio', 'categoría', 'código', 'stock'];
  const rows = products.map((p) => [
    `"${p.name}"`,
    `"${p.brand}"`,
    p.salePrice,
    `"${p.category}"`,
    `"${p.barcode}"`,
    p.stock,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
