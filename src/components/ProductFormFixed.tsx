import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Package, Save, Percent } from 'lucide-react';
import { Product, BABY_CATEGORIES } from '../types';
import { useInventoryStore } from '../store/inventoryStore';
import { PriceInput } from './PriceInput';
import { calcProfit, calcMargin, formatCOP, formatPercent } from '../utils/format';

const MARGIN_OPTIONS = [20, 40, 50, 80];
const DEFAULT_MARGIN = 40;

interface ProductFormProps {
  initialBarcode?: string;
  editProduct?: Product | null;
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function ProductFormFixed({ initialBarcode, editProduct, onSave, onCancel }: ProductFormProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const { products } = useInventoryStore();
  const [barcode, setBarcode] = useState(editProduct?.barcode || initialBarcode || '');
  const [name, setName] = useState(editProduct?.name || '');
  const [brand, setBrand] = useState(editProduct?.brand || '');
  const [category, setCategory] = useState(editProduct?.category || '');
  const [costPrice, setCostPrice] = useState(editProduct?.costPrice || 0);
  const [salePrice, setSalePrice] = useState(editProduct?.salePrice || 0);
  const [stock, setStock] = useState(editProduct?.stock || 1);
  const [marginPct, setMarginPct] = useState(DEFAULT_MARGIN);

  const profit = calcProfit(salePrice, costPrice);
  const margin = calcMargin(salePrice, costPrice);

  const handleSalePriceChange = (val: number) => {
    setSalePrice(val);
    if (val > 0) {
      setCostPrice(Math.round(val / (1 + marginPct / 100)));
    } else {
      setCostPrice(0);
    }
  };

  const handleMarginChange = (pct: number) => {
    setMarginPct(pct);
    if (salePrice > 0) {
      setCostPrice(Math.round(salePrice / (1 + pct / 100)));
    }
  };
  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...BABY_CATEGORIES,
          ...products.map((product) => product.category.trim()).filter(Boolean),
        ])
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const quickCategories = categoryOptions.slice(0, 8);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => nameRef.current?.focus(), 100);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim() || !category.trim()) return;

    onSave({
      barcode: barcode.trim(),
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      costPrice,
      salePrice,
      stock,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onKeyDown={handleKeyDown}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {editProduct ? 'Editar producto' : 'Nuevo producto'}
              </h2>
              <p className="text-xs text-slate-500">
                {editProduct ? 'Modifica los datos del producto' : 'Completa los datos del producto'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Codigo de barras</label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Escanea o escribe el codigo"
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 font-mono text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all bg-slate-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Nombre del producto <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Body manga larga talla 3"
              required
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Marca <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Huggies, Fisher-Price, Carters..."
              required
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Categoria <span className="text-red-500">*</span>
            </label>
            <input
              list="product-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Escribe o elige una categoria"
              required
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
            />
            <datalist id="product-category-options">
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {quickCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    category === cat
                      ? 'bg-violet-600 text-white'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Puedes escribir una nueva categoria o tocar una sugerencia.
            </p>
          </div>

          {/* Margin selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-violet-500" />
              Ganancia
            </label>
            <div className="flex gap-2">
              {MARGIN_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleMarginChange(pct)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    marginPct === pct
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <PriceInput
              id="sale-price"
              label="Precio venta *"
              value={salePrice}
              onChange={handleSalePriceChange}
              placeholder="0"
            />
            <div>
              <PriceInput
                id="cost-price"
                label="Precio costo"
                value={costPrice}
                onChange={setCostPrice}
                placeholder="0"
              />
              <p className="text-xs text-slate-400 mt-1">Auto · {marginPct}% ganancia</p>
            </div>
          </div>

          {costPrice > 0 && salePrice > 0 && (
            <div
              className={`rounded-xl p-3 flex items-center justify-between text-sm ${
                profit >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <span className={`font-medium ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                Ganancia por unidad
              </span>
              <div className="text-right">
                <span className={`font-bold text-base ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${formatCOP(profit)}
                </span>
                <span
                  className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {formatPercent(margin)}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">Stock inicial</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStock(Math.max(0, stock - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xl flex items-center justify-center transition-colors"
              >
                -
              </button>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))}
                min="0"
                className="flex-1 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-center font-bold text-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setStock(stock + 1)}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xl flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !brand.trim() || !category.trim()}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
            >
              <Save className="w-5 h-5" />
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
