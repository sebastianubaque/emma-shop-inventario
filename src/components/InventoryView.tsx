import { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Download, Trash2, Edit3, ChevronUp, ChevronDown,
  Package, X, Check, SlidersHorizontal, RefreshCcw, ChevronRight, Layers, Printer,
} from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { Product, getTotalStock } from '../types';
import { formatCOP, calcProfit, calcMargin, formatPercent, exportToCSV, downloadFile } from '../utils/format';
import { ProductFormFixed } from './ProductFormFixed';
import { PriceInput } from './PriceInput';

type SortKey = keyof Product;

interface InlineEditState {
  id: string;
  field: string;
  value: string | number;
  variantSize?: string;
}

export function InventoryView() {
  const { products, updateProduct, updateVariantStock, removeProduct, clearProducts, filter, setFilter, resetFilter } = useInventoryStore();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [clearAllConfirm, setClearAllConfirm] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  const filtered = useMemo(() => {
    let result = [...products];
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      );
    }
    if (filter.category) result = result.filter((p) => p.category === filter.category);
    if (filter.brand) result = result.filter((p) => p.brand === filter.brand);

    result.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return result;
  }, [products, filter, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortKey }) => {
    if (sortKey !== field) return <ChevronUp className="w-3 h-3 text-slate-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-500" /> : <ChevronDown className="w-3 h-3 text-violet-500" />;
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const rows = products.flatMap((p) => {
      if (p.variants && p.variants.length > 0) {
        return p.variants.map((v) => ({
          name: p.name, brand: p.brand, salePrice: p.salePrice,
          category: p.category, size: v.size, barcode: v.barcode || p.barcode, stock: v.stock,
        }));
      }
      return [{ name: p.name, brand: p.brand, salePrice: p.salePrice, category: p.category, size: p.size || '', barcode: p.barcode, stock: p.stock }];
    });
    const csv = exportToCSV(rows);
    downloadFile(csv, `inventario-bebes-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  };

  const commitInlineEdit = useCallback(async () => {
    if (!inlineEdit) return;
    const { id, field, value, variantSize } = inlineEdit;
    if (field === 'variantStock' && variantSize !== undefined) {
      await updateVariantStock(id, variantSize, Number(value));
    } else {
      await updateProduct(id, { [field]: value });
    }
    setInlineEdit(null);
  }, [inlineEdit, updateProduct, updateVariantStock]);

  const handleDelete = async (id: string) => {
    if (deleteConfirm === id) { await removeProduct(id); setDeleteConfirm(null); }
    else { setDeleteConfirm(id); setTimeout(() => setDeleteConfirm(null), 3000); }
  };

  const handleClearAll = async () => {
    if (products.length === 0) return;
    if (clearAllConfirm) { await clearProducts(); setClearAllConfirm(false); return; }
    setClearAllConfirm(true);
    setTimeout(() => setClearAllConfirm(false), 4000);
  };

  const activeFilters = (filter.search ? 1 : 0) + (filter.category ? 1 : 0) + (filter.brand ? 1 : 0);
  const totalStock = filtered.reduce((s, p) => s + getTotalStock(p), 0);
  const totalValue = filtered.reduce((s, p) => s + p.salePrice * getTotalStock(p), 0);

  return (
    <>
      {editingProduct && (
        <ProductFormFixed
          editProduct={editingProduct}
          onSave={async (data) => { await updateProduct(editingProduct.id, data); setEditingProduct(null); }}
          onCancel={() => setEditingProduct(null)}
        />
      )}

      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={filter.search} onChange={(e) => setFilter({ search: e.target.value })}
              placeholder="Buscar producto, marca, código..."
              className="w-full pl-9 pr-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
            />
            {filter.search && (
              <button onClick={() => setFilter({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${activeFilters > 0 ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {activeFilters > 0 && <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">{activeFilters}</span>}
          </button>

          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>

          <button onClick={handleClearAll} disabled={products.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${clearAllConfirm ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800'} disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}>
            <Trash2 className="w-4 h-4" />
            {clearAllConfirm ? 'Confirmar borrado total' : 'Eliminar todos los datos'}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-40">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Filter className="w-3 h-3" /> Categoría</label>
              <select value={filter.category} onChange={(e) => setFilter({ category: e.target.value })}
                className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white">
                <option value="">Todas</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Filter className="w-3 h-3" /> Marca</label>
              <select value={filter.brand} onChange={(e) => setFilter({ brand: e.target.value })}
                className="px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white">
                <option value="">Todas</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            {activeFilters > 0 && (
              <button onClick={resetFilter} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors">
                <RefreshCcw className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>Mostrando <strong className="text-slate-900">{filtered.length}</strong> de {products.length} productos</span>
          <span>·</span>
          <span>Stock total: <strong className="text-slate-900">{totalStock}</strong></span>
          <span>·</span>
          <span>Valor: <strong className="text-emerald-600">${formatCOP(totalValue)}</strong></span>
        </div>

        {/* Table */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay productos en el inventario</p>
            <p className="text-slate-400 text-sm mt-1">Escanea un producto o crea uno nuevo</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 w-8" />
                    {([
                      { key: 'barcode' as SortKey, label: 'Código' },
                      { key: 'name' as SortKey, label: 'Nombre' },
                      { key: 'brand' as SortKey, label: 'Marca' },
                      { key: 'category' as SortKey, label: 'Categoría' },
                      { key: 'costPrice' as SortKey, label: 'P. Costo' },
                      { key: 'salePrice' as SortKey, label: 'P. Venta' },
                      { key: 'stock' as SortKey, label: 'Stock' },
                    ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)}
                        className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-violet-600 select-none whitespace-nowrap">
                        <div className="flex items-center gap-1">{label}<SortIcon field={key} /></div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Ganancia</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Margen</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((product) => {
                    const profit = calcProfit(product.salePrice, product.costPrice);
                    const margin = calcMargin(product.salePrice, product.costPrice);
                    const totalProdStock = getTotalStock(product);
                    const hasMultipleVariants = product.variants && product.variants.length > 1;
                    const isExpanded = expandedIds.has(product.id);

                    return (
                      <>
                        {/* Main product row */}
                        <tr key={product.id} className={`transition-colors group ${isExpanded ? 'bg-violet-50/40' : 'hover:bg-slate-50/80'}`}>
                          {/* Expand toggle */}
                          <td className="px-2 py-3 w-8">
                            {hasMultipleVariants ? (
                              <button
                                type="button"
                                onClick={() => toggleExpand(product.id)}
                                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isExpanded ? 'bg-violet-100 text-violet-600' : 'text-slate-300 hover:text-violet-500 hover:bg-violet-50'}`}
                                title={isExpanded ? 'Ocultar tallas' : 'Ver tallas'}
                              >
                                <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            ) : null}
                          </td>

                          {/* Barcode */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {product.barcode || '—'}
                            </span>
                          </td>

                          {/* Name - inline editable */}
                          <td className="px-4 py-3 min-w-[160px]">
                            {inlineEdit?.id === product.id && inlineEdit.field === 'name' ? (
                              <div className="flex items-center gap-1">
                                <input autoFocus type="text" value={String(inlineEdit.value)}
                                  onChange={(e) => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                                  onBlur={commitInlineEdit}
                                  onKeyDown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit(null); }}
                                  className="w-full px-2 py-1 border-2 border-violet-400 rounded-lg text-sm focus:outline-none"
                                />
                                <button onClick={commitInlineEdit} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 cursor-pointer hover:text-violet-600 transition-colors"
                                  onClick={() => setInlineEdit({ id: product.id, field: 'name', value: product.name })}
                                  title="Click para editar"
                                >
                                  {product.name}
                                </span>
                                {hasMultipleVariants && (
                                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 text-xs font-bold">
                                    <Layers className="w-3 h-3" />{product.variants!.length}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Brand */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">{product.brand}</span>
                          </td>

                          {/* Category */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-semibold">{product.category}</span>
                          </td>

                          {/* Cost Price */}
                          <td className="px-4 py-3 font-medium text-slate-600">${formatCOP(product.costPrice)}</td>

                          {/* Sale Price - inline editable */}
                          <td className="px-4 py-3">
                            {inlineEdit?.id === product.id && inlineEdit.field === 'salePrice' ? (
                              <div className="flex items-center gap-1 min-w-[120px]">
                                <PriceInput label="" value={Number(inlineEdit.value)} onChange={(v) => setInlineEdit({ ...inlineEdit, value: v })} />
                                <button onClick={commitInlineEdit} className="text-emerald-500 mt-auto mb-0.5"><Check className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-900 cursor-pointer hover:text-violet-600 transition-colors"
                                onClick={() => setInlineEdit({ id: product.id, field: 'salePrice', value: product.salePrice })}
                                title="Click para editar precio">
                                ${formatCOP(product.salePrice)}
                              </span>
                            )}
                          </td>

                          {/* Stock */}
                          <td className="px-4 py-3">
                            {hasMultipleVariants ? (
                              <span className={`font-bold ${totalProdStock === 0 ? 'text-red-500' : totalProdStock <= 3 ? 'text-amber-500' : 'text-slate-900'}`}>
                                {totalProdStock}
                              </span>
                            ) : inlineEdit?.id === product.id && inlineEdit.field === 'stock' ? (
                              <div className="flex items-center gap-1">
                                <input autoFocus type="number" min="0" value={Number(inlineEdit.value)}
                                  onChange={(e) => setInlineEdit({ ...inlineEdit, value: Number(e.target.value) })}
                                  onBlur={commitInlineEdit}
                                  onKeyDown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit(null); }}
                                  className="w-20 px-2 py-1 border-2 border-violet-400 rounded-lg text-sm text-center focus:outline-none"
                                />
                                <button onClick={commitInlineEdit} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <span
                                className={`font-bold cursor-pointer hover:text-violet-600 transition-colors ${totalProdStock === 0 ? 'text-red-500' : totalProdStock <= 3 ? 'text-amber-500' : 'text-slate-900'}`}
                                onClick={() => setInlineEdit({ id: product.id, field: 'stock', value: totalProdStock })}
                                title="Click para editar stock"
                              >
                                {totalProdStock}
                              </span>
                            )}
                          </td>

                          {/* Profit */}
                          <td className="px-4 py-3">
                            <span className={`font-semibold text-sm ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>${formatCOP(profit)}</span>
                          </td>

                          {/* Margin */}
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${margin >= 30 ? 'bg-emerald-100 text-emerald-700' : margin >= 15 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {formatPercent(margin)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => updateProduct(product.id, { needsPrintedBarcode: !product.needsPrintedBarcode })}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                                  product.needsPrintedBarcode
                                    ? 'bg-amber-400 text-white'
                                    : 'bg-slate-100 hover:bg-amber-100 hover:text-amber-600'
                                }`}
                                title={product.needsPrintedBarcode ? 'Marcado para imprimir · click para quitar' : 'Marcar para imprimir código'}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingProduct(product)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center transition-colors" title="Editar">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDelete(product.id)}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${deleteConfirm === product.id ? 'bg-red-500 text-white' : 'bg-slate-100 hover:bg-red-100 hover:text-red-600'}`}
                                title={deleteConfirm === product.id ? 'Confirmar eliminación' : 'Eliminar'}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Variant rows */}
                        {hasMultipleVariants && isExpanded && product.variants!.map((variant) => (
                          <tr key={`${product.id}-${variant.size}`} className="bg-violet-50/30 border-l-2 border-l-violet-300">
                            <td className="px-2 py-2" />
                            <td className="px-4 py-2">
                              {variant.barcode && (
                                <span className="font-mono text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{variant.barcode}</span>
                              )}
                            </td>
                            <td className="px-4 py-2" colSpan={2}>
                              <span className="text-xs text-slate-400 italic">↳ talla</span>
                              <span className="ml-2 px-2.5 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold">{variant.size}</span>
                            </td>
                            <td className="px-4 py-2" colSpan={2} />
                            <td className="px-4 py-2" />
                            {/* Variant stock - inline editable */}
                            <td className="px-4 py-2">
                              {inlineEdit?.id === product.id && inlineEdit.variantSize === variant.size ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus type="number" min="0" value={Number(inlineEdit.value)}
                                    onChange={(e) => setInlineEdit({ ...inlineEdit, value: Number(e.target.value) })}
                                    onBlur={commitInlineEdit}
                                    onKeyDown={(e) => { if (e.key === 'Enter') commitInlineEdit(); if (e.key === 'Escape') setInlineEdit(null); }}
                                    className="w-20 px-2 py-1 border-2 border-violet-400 rounded-lg text-sm text-center focus:outline-none"
                                  />
                                  <button onClick={commitInlineEdit} className="text-emerald-500"><Check className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <span
                                  className={`text-sm font-bold cursor-pointer hover:text-violet-600 transition-colors ${variant.stock === 0 ? 'text-red-400' : variant.stock <= 3 ? 'text-amber-500' : 'text-slate-700'}`}
                                  onClick={() => setInlineEdit({ id: product.id, field: 'variantStock', value: variant.stock, variantSize: variant.size })}
                                  title="Click para editar stock de esta talla"
                                >
                                  {variant.stock}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2" colSpan={3} />
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
