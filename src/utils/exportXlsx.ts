import * as XLSX from 'xlsx';

export interface ExportSheet {
  name: string;
  rows: Record<string, string | number | null | undefined>[];
}

export interface TreinteProduct {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  size?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  variants?: { size: string; stock: number; barcode?: string }[];
  needsPrintedBarcode?: boolean;
  createdAt: string;
}

function getTotalStockLocal(p: TreinteProduct): number {
  if (p.variants && p.variants.length > 0) return p.variants.reduce((s, v) => s + v.stock, 0);
  return p.stock ?? 0;
}

function buildProductRows(products: TreinteProduct[]): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];
  products.forEach((p) => {
    const hasV = p.variants && p.variants.length > 0;
    if (hasV) {
      p.variants!.forEach((v) => {
        rows.push({
          'Codigo': p.barcode,
          'Nombre': p.name,
          'Marca': p.brand,
          'Categoria': p.category,
          'Talla': v.size,
          'Stock': v.stock,
          'Precio Costo': p.costPrice,
          'Precio Venta': p.salePrice,
          'Fecha Alta': new Date(p.createdAt).toLocaleDateString('es-CO'),
        });
      });
    } else {
      rows.push({
        'Codigo': p.barcode,
        'Nombre': p.name,
        'Marca': p.brand,
        'Categoria': p.category,
        'Talla': p.size || 'Unico',
        'Stock': getTotalStockLocal(p),
        'Precio Costo': p.costPrice,
        'Precio Venta': p.salePrice,
        'Fecha Alta': new Date(p.createdAt).toLocaleDateString('es-CO'),
      });
    }
  });
  return rows;
}

function triggerDownload(buf: ArrayBuffer, filename: string): void {
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const nav = navigator as Navigator & { msSaveBlob?: (b: Blob, n: string) => void };
  if (nav.msSaveBlob) { nav.msSaveBlob(blob, filename); return; }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// Used by DashboardView
export function downloadXlsx(sheets: ExportSheet[], filename: string): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  triggerDownload(buf, filename);
}

function downloadProductXlsx(
  sheets: { name: string; products: TreinteProduct[] }[],
  filename: string,
): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const rows = buildProductRows(s.products);
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  triggerDownload(buf, filename);
}

export function downloadPrintPendingExcel(products: TreinteProduct[]): void {
  const date = new Date().toISOString().slice(0, 10);
  downloadProductXlsx(
    [{ name: 'Para Imprimir Codigo', products }],
    `codigos-para-imprimir-${date}.xlsx`,
  );
}

export function downloadTreinteExcel(products: TreinteProduct[]): void {
  const withCode = products.filter((p) => p.needsPrintedBarcode === true);
  const withoutCode = products.filter((p) => p.needsPrintedBarcode !== true);
  const date = new Date().toISOString().slice(0, 10);
  downloadProductXlsx(
    [
      { name: 'Codigos Generados', products: withCode },
      { name: 'Pendientes de Codigo', products: withoutCode },
      { name: 'Base Completa Treinta', products: [...withCode, ...withoutCode] },
    ],
    `treinta-inventario-${date}.xlsx`,
  );
}
