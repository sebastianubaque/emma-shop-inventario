export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
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
