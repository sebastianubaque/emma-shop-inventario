import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Package, Save, Percent, Ruler, Wand2, Plus, Trash2, Layers, Printer } from 'lucide-react';
import { Product, ProductVariant, BABY_CATEGORIES, BABY_SIZES } from '../types';
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

  const [autoBarcode, setAutoBarcode] = useState(false);
  const [needsPrintedBarcode, setNeedsPrintedBarcode] = useState(editProduct?.needsPrintedBarcode ?? false);
  const [barcode, setBarcode] = useState(editProduct?.barcode || initialBarcode || '');
  const [name, setName] = useState(editProduct?.name || '');
  const [brand, setBrand] = useState(editProduct?.brand || '');
  const [category, setCategory] = useState(editProduct?.category || '');
  const [costPrice, setCostPrice] = useState(editProduct?.costPrice || 0);
  const [salePrice, setSalePrice] = useState(editProduct?.salePrice || 0);
  const [marginPct, setMarginPct] = useState(DEFAULT_MARGIN);

  // Variants state — initialize from editProduct or from legacy size+stock fields
  const initialVariants: ProductVariant[] = useMemo(() => {
    if (editProduct?.variants && editProduct.variants.length > 0) return editProduct.variants;
    if (editProduct) {
      return [{ size: editProduct.size || 'Único', stock: editProduct.stock ?? 1 }];
    }
    return [{ size: '', stock: 1 }];
  }, [editProduct]);

  const [variants, setVariants] = useState<ProductVariant[]>(initialVariants);
  const [newVariantSize, setNewVariantSize] = useState('');

  const profit = calcProfit(salePrice, costPrice);
  const margin = calcMargin(salePrice, costPrice);
  const totalStock = variants.reduce((s, v) => s + v.stock, 0);

  const handleSalePriceChange = (val: number) => {
    setSalePrice(val);
    if (val > 0) setCostPrice(Math.round(val / (1 + marginPct / 100)));
    else setCostPrice(0);
  };

  const handleMarginChange = (pct: number) => {
    setMarginPct(pct);
    if (salePrice > 0) setCostPrice(Math.round(salePrice / (1 + pct / 100)));
  };

  const categoryOptions = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((acc, p) => {
      const cat = p.category.trim();
      if (cat) acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const all = Array.from(new Set([...BABY_CATEGORIES, ...Object.keys(counts)]));
    return all.sort((a, b) => ((counts[b] || 0) - (counts[a] || 0)) || a.localeCompare(b));
  }, [products]);
  const quickCategories = categoryOptions.slice(0, 8);

  const brandOptions = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const quickBrands = brandOptions.slice(0, 8);

  const generateBarcode = (n: string, b: string) => {
    const d = new Date();
    const datePart = `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getFullYear()).slice(2)}`;
    const namePart = n.trim().slice(0, 4).toUpperCase().replace(/\s/g, '') || 'PROD';
    const brandPart = b.trim().slice(0, 3).toUpperCase().replace(/\s/g, '') || 'MRC';
    return `${datePart}${brandPart}${namePart}`;
  };

  const handleToggleAutoBarcode = () => {
    const next = !autoBarcode;
    setAutoBarcode(next);
    if (next) setBarcode(generateBarcode(name, brand));
    else setBarcode('');
  };

  useEffect(() => {
    if (autoBarcode) setBarcode(generateBarcode(name, brand));
  }, [autoBarcode, name, brand]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => nameRef.current?.focus(), 100);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Variant helpers
  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    setVariants((prev) => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) return;
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const addVariant = (size: string) => {
    const trimmed = size.trim();
    if (!trimmed) return;
    if (variants.some((v) => v.size === trimmed)) return;
    setVariants((prev) => [...prev, { size: trimmed, stock: 0 }]);
    setNewVariantSize('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim() || !category.trim()) return;

    // Filter out empty-size variants; if none remain, treat as a single "Único" variant
    const validVariants = variants.filter((v) => v.size.trim());
    const cleanVariants = validVariants.length > 0
      ? validVariants.map((v) => ({ ...v, size: v.size.trim() }))
      : [{ size: 'Único', stock: variants[0]?.stock ?? 1 }];

    const stock = cleanVariants.reduce((s, v) => s + v.stock, 0);
    const primarySize = cleanVariants.length === 1 ? cleanVariants[0].size : undefined;

    onSave({
      barcode: barcode.trim(),
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      size: primarySize,
      costPrice,
      salePrice,
      stock,
      variants: cleanVariants,
      needsPrintedBarcode,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  const usedSizes = new Set(variants.map((v) => v.size));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onKeyDown={handleKeyDown}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        {/* Header */}
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
          <button onClick={onCancel} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Barcode */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Código de barras</label>
              <button
                type="button"
                onClick={handleToggleAutoBarcode}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  autoBarcode ? 'bg-violet-600 text-white shadow-sm shadow-violet-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" />
                Generar automáticamente
              </button>
            </div>
            <input
              type="text"
              value={barcode}
              onChange={(e) => { if (!autoBarcode) setBarcode(e.target.value); }}
              placeholder={autoBarcode ? 'Se generará al guardar' : 'Escanea o escribe el código'}
              readOnly={autoBarcode}
              className={`w-full px-3 py-2.5 border-2 rounded-xl text-slate-900 font-mono text-sm focus:outline-none transition-all ${
                autoBarcode ? 'border-violet-300 bg-violet-50 text-violet-700 cursor-default' : 'border-slate-200 bg-slate-50 focus:border-violet-500 focus:ring-2 focus:ring-violet-100'
              }`}
            />
            <button
              type="button"
              onClick={() => setNeedsPrintedBarcode((v) => !v)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                needsPrintedBarcode
                  ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm shadow-amber-100'
                  : 'bg-white border-dashed border-slate-300 text-slate-500 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              <Printer className="w-4 h-4" />
              {needsPrintedBarcode ? 'Marcado para imprimir código ✓' : 'Crear código (marcar para imprimir)'}
            </button>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-700">
              Nombre del producto <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Body manga larga estampado"
              required
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>

          {/* Brand */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Marca <span className="text-red-500">*</span>
            </label>
            <input
              list="product-brand-options"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Huggies, Fisher-Price, Carters..."
              required
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
            />
            <datalist id="product-brand-options">
              {brandOptions.map((b) => <option key={b} value={b} />)}
            </datalist>
            {quickBrands.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quickBrands.map((b) => (
                  <button key={b} type="button" onClick={() => setBrand(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${brand === b ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700">
              Categoría <span className="text-red-500">*</span>
            </label>
            <input
              list="product-category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Escribe o elige una categoría"
              required
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all bg-white"
            />
            <datalist id="product-category-options">
              {categoryOptions.map((cat) => <option key={cat} value={cat} />)}
            </datalist>
            <div className="flex flex-wrap gap-2">
              {quickCategories.map((cat) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${category === cat ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Variants / Sizes */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-violet-500" />
              <label className="text-sm font-semibold text-slate-700">Tallas / Stock</label>
              <span className="ml-auto text-xs text-slate-400">
                Stock total: <strong className="text-slate-700">{totalStock}</strong>
              </span>
            </div>

            {/* Existing variants */}
            <div className="flex flex-col gap-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                  <input
                    type="text"
                    value={variant.size}
                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                    placeholder="Talla"
                    className="flex-1 px-2.5 py-1.5 border-2 border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:border-violet-500 bg-white min-w-0"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateVariant(index, 'stock', Math.max(0, variant.stock - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center transition-colors text-base leading-none"
                    >−</button>
                    <input
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(e) => updateVariant(index, 'stock', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-12 px-1 py-1.5 border-2 border-slate-200 rounded-lg text-center text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-500 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => updateVariant(index, 'stock', variant.stock + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold flex items-center justify-center transition-colors text-base leading-none"
                    >+</button>
                  </div>
                  {variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new variant */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newVariantSize}
                  onChange={(e) => setNewVariantSize(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVariant(newVariantSize); } }}
                  placeholder="Nueva talla (ej: 6-9m, 2A...)"
                  className="flex-1 px-3 py-2 border-2 border-dashed border-violet-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 bg-white"
                />
                <button
                  type="button"
                  onClick={() => addVariant(newVariantSize)}
                  disabled={!newVariantSize.trim() || usedSizes.has(newVariantSize.trim())}
                  className="px-3 py-2 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {BABY_SIZES.filter((s) => !usedSizes.has(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addVariant(s)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Layers className="w-3 h-3" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Margin selector */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-violet-500" />
              Ganancia
            </label>
            <div className="flex gap-2">
              {MARGIN_OPTIONS.map((pct) => (
                <button key={pct} type="button" onClick={() => handleMarginChange(pct)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${marginPct === pct ? 'bg-violet-600 text-white shadow-md shadow-violet-200' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <PriceInput id="sale-price" label="Precio venta *" value={salePrice} onChange={handleSalePriceChange} placeholder="0" />
            <div>
              <PriceInput id="cost-price" label="Precio costo" value={costPrice} onChange={setCostPrice} placeholder="0" />
              <p className="text-xs text-slate-400 mt-1">Auto · {marginPct}% ganancia</p>
            </div>
          </div>

          {costPrice > 0 && salePrice > 0 && (
            <div className={`rounded-xl p-3 flex items-center justify-between text-sm ${profit >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <span className={`font-medium ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>Ganancia por unidad</span>
              <div className="text-right">
                <span className={`font-bold text-base ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${formatCOP(profit)}</span>
                <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {formatPercent(margin)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
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
