// Minimal XLSX writer — no external dependencies.
// Generates a valid Office Open XML workbook with multiple sheets.

type CellValue = string | number | null | undefined;
type SheetData = Record<string, CellValue>[];

function escapeXml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(idx: number): string {
  let name = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function buildSheetXml(rows: SheetData, headers: string[]): string {
  const cells: string[] = [];
  headers.forEach((h, ci) => {
    const addr = `${colName(ci)}1`;
    cells.push(`<c r="${addr}" t="inlineStr"><is><t>${escapeXml(h)}</t></is></c>`);
  });
  rows.forEach((row, ri) => {
    headers.forEach((h, ci) => {
      const val = row[h];
      const addr = `${colName(ci)}${ri + 2}`;
      if (val === null || val === undefined || val === '') return;
      if (typeof val === 'number') {
        cells.push(`<c r="${addr}"><v>${val}</v></c>`);
      } else {
        cells.push(`<c r="${addr}" t="inlineStr"><is><t>${escapeXml(String(val))}</t></is></c>`);
      }
    });
  });
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetData>${cells.join('')}</sheetData></worksheet>`;
}

function buildWorkbookXml(sheetNames: string[]): string {
  const sheets = sheetNames
    .map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"`
    + ` xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
    + `<sheets>${sheets}</sheets></workbook>`;
}

function buildWorkbookRels(count: number): string {
  const rels = Array.from({ length: count }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

const CONTENT_TYPES_START = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
  + `<Default Extension="xml" ContentType="application/xml"/>`
  + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>`
  + `</Relationships>`;

function u8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function crc32(data: Uint8Array): number {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function le16(n: number): number[] { return [n & 0xff, (n >> 8) & 0xff]; }
function le32(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}

function writeZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const localParts: number[] = [];
  const centralDirs: number[] = [];
  const offsets: number[] = [];

  for (const file of files) {
    offsets.push(localParts.length);
    const nameBytes = Array.from(u8(file.name));
    const crc = crc32(file.data);
    const size = file.data.length;

    localParts.push(
      0x50, 0x4b, 0x03, 0x04,
      0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ...le32(crc), ...le32(size), ...le32(size),
      ...le16(nameBytes.length), 0x00, 0x00,
      ...nameBytes,
    );
    localParts.push(...Array.from(file.data));

    centralDirs.push(
      0x50, 0x4b, 0x01, 0x02,
      0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ...le32(crc), ...le32(size), ...le32(size),
      ...le16(nameBytes.length),
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ...le32(offsets[offsets.length - 1]),
      ...nameBytes,
    );
  }

  const cdOffset = localParts.length;
  const cdSize = centralDirs.length;
  const eocd = [
    0x50, 0x4b, 0x05, 0x06,
    0x00, 0x00, 0x00, 0x00,
    ...le16(files.length), ...le16(files.length),
    ...le32(cdSize), ...le32(cdOffset),
    0x00, 0x00,
  ];

  const all = new Uint8Array(localParts.length + centralDirs.length + eocd.length);
  all.set(localParts);
  all.set(centralDirs, localParts.length);
  all.set(eocd, localParts.length + centralDirs.length);
  return all;
}

function triggerDownload(data: Uint8Array, filename: string): void {
  const blob = new Blob(
    [data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  );
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

export interface ExportSheet {
  name: string;
  rows: SheetData;
}

// Used by DashboardView — infers headers from first row keys
export function downloadXlsx(sheets: ExportSheet[], filename: string): void {
  const zipFiles: { name: string; data: Uint8Array }[] = [];
  let contentTypes = CONTENT_TYPES_START;
  sheets.forEach((_, i) => {
    contentTypes += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  });
  contentTypes += `</Types>`;
  zipFiles.push({ name: '[Content_Types].xml', data: u8(contentTypes) });
  zipFiles.push({ name: '_rels/.rels', data: u8(ROOT_RELS) });
  zipFiles.push({ name: 'xl/workbook.xml', data: u8(buildWorkbookXml(sheets.map((s) => s.name))) });
  zipFiles.push({ name: 'xl/_rels/workbook.xml.rels', data: u8(buildWorkbookRels(sheets.length)) });
  sheets.forEach((sheet, i) => {
    const headers = sheet.rows.length > 0 ? Object.keys(sheet.rows[0]) : [];
    zipFiles.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: u8(buildSheetXml(sheet.rows, headers)) });
  });
  triggerDownload(writeZip(zipFiles), filename);
}

// ── Product exports ──────────────────────────────────────────────────────────

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

const PRODUCT_HEADERS = [
  'Codigo', 'Nombre', 'Marca', 'Categoria', 'Talla',
  'Stock', 'Precio Costo', 'Precio Venta', 'Fecha Alta',
];

function getTotalStockLocal(p: TreinteProduct): number {
  if (p.variants && p.variants.length > 0) return p.variants.reduce((s, v) => s + v.stock, 0);
  return p.stock ?? 0;
}

function buildProductRows(products: TreinteProduct[]): SheetData {
  const rows: SheetData = [];
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

function buildProductXlsx(
  sheets: { name: string; products: TreinteProduct[] }[],
  filename: string,
): void {
  const zipFiles: { name: string; data: Uint8Array }[] = [];
  let contentTypes = CONTENT_TYPES_START;
  sheets.forEach((_, i) => {
    contentTypes += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
  });
  contentTypes += `</Types>`;
  zipFiles.push({ name: '[Content_Types].xml', data: u8(contentTypes) });
  zipFiles.push({ name: '_rels/.rels', data: u8(ROOT_RELS) });
  zipFiles.push({ name: 'xl/workbook.xml', data: u8(buildWorkbookXml(sheets.map((s) => s.name))) });
  zipFiles.push({ name: 'xl/_rels/workbook.xml.rels', data: u8(buildWorkbookRels(sheets.length)) });
  sheets.forEach((sheet, i) => {
    const rows = buildProductRows(sheet.products);
    zipFiles.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: u8(buildSheetXml(rows, PRODUCT_HEADERS)) });
  });
  triggerDownload(writeZip(zipFiles), filename);
}

export function downloadPrintPendingExcel(products: TreinteProduct[]): void {
  const date = new Date().toISOString().slice(0, 10);
  buildProductXlsx(
    [{ name: 'Para Imprimir Codigo', products }],
    `codigos-para-imprimir-${date}.xlsx`,
  );
}

export function downloadTreinteExcel(products: TreinteProduct[]): void {
  const withCode = products.filter((p) => p.needsPrintedBarcode === true);
  const withoutCode = products.filter((p) => p.needsPrintedBarcode !== true);
  const date = new Date().toISOString().slice(0, 10);
  buildProductXlsx(
    [
      { name: 'Codigos Generados', products: withCode },
      { name: 'Pendientes de Codigo', products: withoutCode },
      { name: 'Base Completa Treinta', products: [...withCode, ...withoutCode] },
    ],
    `treinta-inventario-${date}.xlsx`,
  );
}
