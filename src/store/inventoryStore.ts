import { create } from 'zustand';
import { Product, ViewMode, FilterState } from '../types';
import {
  getAllProducts,
  saveProduct,
  deleteProduct,
  clearAllProducts,
  getProductByBarcode,
  bulkSaveProducts,
} from '../utils/db';
import { generateId } from '../utils/format';
import { createDemoProducts } from '../utils/seedData';

interface InventoryState {
  products: Product[];
  currentView: ViewMode;
  isLoading: boolean;
  lastScannedBarcode: string | null;
  scanFeedback: 'idle' | 'found' | 'new' | 'updated';
  showProductForm: boolean;
  editingProduct: Product | null;
  filter: FilterState;

  // Actions
  loadProducts: () => Promise<void>;
  setView: (view: ViewMode) => void;
  scanBarcode: (barcode: string) => Promise<'found' | 'new'>;
  addProduct: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => Promise<void>;
  clearProducts: () => Promise<void>;
  incrementStock: (id: string, amount?: number) => Promise<void>;
  setShowProductForm: (show: boolean) => void;
  setEditingProduct: (product: Product | null) => void;
  setScanFeedback: (feedback: 'idle' | 'found' | 'new' | 'updated') => void;
  setFilter: (filter: Partial<FilterState>) => void;
  resetFilter: () => void;
}

const defaultFilter: FilterState = {
  search: '',
  category: '',
  brand: '',
};

const DEMO_DATA_SEEDED_KEY = 'baby-store-inventory-demo-seeded';

function hasSeededDemoData() {
  return typeof window !== 'undefined' && window.localStorage.getItem(DEMO_DATA_SEEDED_KEY) === 'true';
}

function markDemoDataAsSeeded() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DEMO_DATA_SEEDED_KEY, 'true');
  }
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  currentView: 'scanner',
  isLoading: false,
  lastScannedBarcode: null,
  scanFeedback: 'idle',
  showProductForm: false,
  editingProduct: null,
  filter: defaultFilter,

  loadProducts: async () => {
    set({ isLoading: true });
    try {
      let products = await getAllProducts();
      // Seed demo data on first load
      if (products.length === 0 && !hasSeededDemoData()) {
        const demoProducts = createDemoProducts();
        await bulkSaveProducts(demoProducts);
        markDemoDataAsSeeded();
        products = demoProducts;
      }
      set({ products });
    } finally {
      set({ isLoading: false });
    }
  },

  setView: (view) => set({ currentView: view }),

  scanBarcode: async (barcode) => {
    const existing = await getProductByBarcode(barcode);
    if (existing) {
      // Increment stock
      await get().incrementStock(existing.id);
      set({ lastScannedBarcode: barcode, scanFeedback: 'updated' });
      return 'found';
    } else {
      set({ lastScannedBarcode: barcode, scanFeedback: 'new' });
      return 'new';
    }
  },

  addProduct: async (data) => {
    const now = new Date().toISOString();
    const product: Product = {
      ...data,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await saveProduct(product);
    set((state) => ({ products: [...state.products, product] }));
  },

  updateProduct: async (id, data) => {
    const state = get();
    const existing = state.products.find((p) => p.id === id);
    if (!existing) return;
    const updated: Product = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await saveProduct(updated);
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }));
  },

  removeProduct: async (id) => {
    await deleteProduct(id);
    set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
  },

  clearProducts: async () => {
    await clearAllProducts();
    markDemoDataAsSeeded();
    set({
      products: [],
      filter: defaultFilter,
      editingProduct: null,
      showProductForm: false,
      lastScannedBarcode: null,
      scanFeedback: 'idle',
    });
  },

  incrementStock: async (id, amount = 1) => {
    const state = get();
    const existing = state.products.find((p) => p.id === id);
    if (!existing) return;
    const updated: Product = {
      ...existing,
      stock: existing.stock + amount,
      updatedAt: new Date().toISOString(),
    };
    await saveProduct(updated);
    set((state) => ({
      products: state.products.map((p) => (p.id === id ? updated : p)),
    }));
  },

  setShowProductForm: (show) => set({ showProductForm: show }),

  setEditingProduct: (product) => set({ editingProduct: product }),

  setScanFeedback: (feedback) => set({ scanFeedback: feedback }),

  setFilter: (filter) =>
    set((state) => ({ filter: { ...state.filter, ...filter } })),

  resetFilter: () => set({ filter: defaultFilter }),
}));
