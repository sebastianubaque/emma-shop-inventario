import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Product } from '../types';

interface BabyStoreDB extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: {
      'by-barcode': string;
      'by-category': string;
      'by-brand': string;
    };
  };
}

let db: IDBPDatabase<BabyStoreDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<BabyStoreDB>> {
  if (db) return db;
  db = await openDB<BabyStoreDB>('baby-store-inventory', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const store = database.createObjectStore('products', { keyPath: 'id' });
        store.createIndex('by-barcode', 'barcode', { unique: false });
        store.createIndex('by-category', 'category', { unique: false });
        store.createIndex('by-brand', 'brand', { unique: false });
      }
      if (oldVersion === 1) {
        // Migrate: drop unique constraint on by-barcode to support variant barcodes
        const store = database.transaction.objectStore('products');
        store.deleteIndex('by-barcode');
        store.createIndex('by-barcode', 'barcode', { unique: false });
      }
    },
  });
  return db;
}

export async function getAllProducts(): Promise<Product[]> {
  const database = await getDB();
  return database.getAll('products');
}

export async function getProductByBarcode(barcode: string): Promise<Product | undefined> {
  const database = await getDB();
  const index = database.transaction('products').store.index('by-barcode');
  return index.get(barcode);
}

export async function saveProduct(product: Product): Promise<void> {
  const database = await getDB();
  await database.put('products', product);
}

export async function deleteProduct(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('products', id);
}

export async function clearAllProducts(): Promise<void> {
  const database = await getDB();
  await database.clear('products');
}

export async function bulkSaveProducts(products: Product[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction('products', 'readwrite');
  await Promise.all([
    ...products.map((p) => tx.store.put(p)),
    tx.done,
  ]);
}
