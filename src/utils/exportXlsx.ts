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

function buildWorkbook(sheets: { name: string; rows: Record<string, string | number>[] }[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows.length > 0 ? s.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  return wb;
}

// Used by DashboardView
export function downloadXlsx(sheets: ExportSheet[], filename: string): void {
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const ws = XLSX.utils.json_to_sheet(s.rows.length > 0 ? s.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, s.name);
  });
  XLSX.writeFile(wb, filename);
}

export function downloadPrintPendingExcel(products: TreinteProduct[]): void {
  const date = new Date().toISOString().slice(0, 10);
  const wb = buildWorkbook([
    { name: 'Para Imprimir Codigo', rows: buildProductRows(products) },
  ]);
  XLSX.writeFile(wb, `codigos-para-imprimir-${date}.xlsx`);
}

export function downloadTreinteExcel(products: TreinteProduct[]): void {
  const withCode = products.filter((p) => p.needsPrintedBarcode === true);
  const withoutCode = products.filter((p) => p.needsPrintedBarcode !== true);
  const date = new Date().toISOString().slice(0, 10);
  const wb = buildWorkbook([
    { name: 'Codigos Generados', rows: buildProductRows(withCode) },
    { name: 'Pendientes de Codigo', rows: buildProductRows(withoutCode) },
    { name: 'Base Completa Treinta', rows: buildProductRows([...withCode, ...withoutCode]) },
  ]);
  XLSX.writeFile(wb, `treinta-inventario-${date}.xlsx`);
}
