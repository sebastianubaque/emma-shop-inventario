export interface ProductVariant {
  size: string;
  stock: number;
  barcode?: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  size?: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  variants?: ProductVariant[];
  needsPrintedBarcode?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getTotalStock(product: Product): number {
  if (product.variants && product.variants.length > 0) {
    return product.variants.reduce((sum, v) => sum + v.stock, 0);
  }
  return product.stock ?? 0;
}

export function getProductBarcode(product: Product): string {
  return product.barcode || '';
}

export function hasVariants(product: Product): boolean {
  return Array.isArray(product.variants) && product.variants.length > 0;
}

export type ProductFormData = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface ScanEvent {
  barcode: string;
  timestamp: number;
}

export type ViewMode = 'scanner' | 'inventory' | 'dashboard';

export type SortField = keyof Product;
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  search: string;
  category: string;
  brand: string;
}

export interface DashboardStats {
  totalCostValue: number;
  totalSaleValue: number;
  totalProfit: number;
  avgMargin: number;
  totalProducts: number;
  totalStock: number;
}

export interface CategoryStat {
  category: string;
  count: number;
  value: number;
  profit: number;
}

export interface BrandStat {
  brand: string;
  count: number;
  value: number;
  profit: number;
  margin: number;
}

export interface PriceRange {
  range: string;
  count: number;
}

export const BABY_SIZES = [
  'RN', '0-3m', '3-6m', '6-9m', '9-12m', '1A', '2A', '3A', '4A',
] as const;

export const BABY_CATEGORIES = [
  'Ropa bebé',
  'Pañales',
  'Juguetes',
  'Accesorios',
  'Alimentación',
  'Higiene',
  'Mobiliario',
  'Seguridad',
  'Libros',
  'Otros',
] as const;

export type BabyCategory = typeof BABY_CATEGORIES[number];
