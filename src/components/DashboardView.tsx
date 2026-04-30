import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, DollarSign, Package, Layers, AlertTriangle, Star, Award, Target
} from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { getTotalStock } from '../types';
import { formatCOP, calcProfit, calcMargin, formatPercent } from '../utils/format';

const COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0891b2', '#65a30d', '#6366f1'];

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

function StatCard({ label, value, sub, icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, prefix = '$' }: {active?: boolean; payload?: {value: number; name?: string}[]; label?: string; prefix?: string}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-3 text-sm">
        <p className="font-bold text-slate-800 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-slate-600">
            {entry.name}: <span className="font-bold text-violet-600">{prefix}{prefix === '$' ? formatCOP(entry.value) : entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function DashboardView() {
  const { products } = useInventoryStore();

  const stats = useMemo(() => {
    const totalCostValue = products.reduce((s, p) => s + p.costPrice * getTotalStock(p), 0);
    const totalSaleValue = products.reduce((s, p) => s + p.salePrice * getTotalStock(p), 0);
    const totalProfit = totalSaleValue - totalCostValue;
    const margins = products.filter(p => p.costPrice > 0).map(p => calcMargin(p.salePrice, p.costPrice));
    const avgMargin = margins.length > 0 ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;
    const totalStock = products.reduce((s, p) => s + getTotalStock(p), 0);
    return { totalCostValue, totalSaleValue, totalProfit, avgMargin, totalProducts: products.length, totalStock };
  }, [products]);

  // By Category
  const byCategory = useMemo(() => {
    const map: Record<string, { count: number; value: number; profit: number; stock: number }> = {};
    products.forEach((p) => {
      const s = getTotalStock(p);
      if (!map[p.category]) map[p.category] = { count: 0, value: 0, profit: 0, stock: 0 };
      map[p.category].count += 1;
      map[p.category].value += p.salePrice * s;
      map[p.category].profit += calcProfit(p.salePrice, p.costPrice) * s;
      map[p.category].stock += s;
    });
    return Object.entries(map)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [products]);

  // By Brand - Top 8
  const byBrand = useMemo(() => {
    const map: Record<string, { count: number; value: number; profit: number; stock: number }> = {};
    products.forEach((p) => {
      const s = getTotalStock(p);
      if (!map[p.brand]) map[p.brand] = { count: 0, value: 0, profit: 0, stock: 0 };
      map[p.brand].count += 1;
      map[p.brand].value += p.salePrice * s;
      map[p.brand].profit += calcProfit(p.salePrice, p.costPrice) * s;
      map[p.brand].stock += s;
    });
    return Object.entries(map)
      .map(([brand, data]) => ({ brand, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [products]);

  // Price distribution
  const priceRanges = useMemo(() => {
    const ranges = [
      { label: '$0-10K', min: 0, max: 10000 },
      { label: '$10K-30K', min: 10000, max: 30000 },
      { label: '$30K-60K', min: 30000, max: 60000 },
      { label: '$60K-100K', min: 60000, max: 100000 },
      { label: '$100K+', min: 100000, max: Infinity },
    ];
    return ranges.map((r) => ({
      range: r.label,
      count: products.filter((p) => p.salePrice >= r.min && p.salePrice < r.max).length,
    }));
  }, [products]);

  // Top by stock value
  const topByValue = useMemo(() =>
    [...products]
      .map((p) => ({ ...p, stockValue: p.salePrice * getTotalStock(p) }))
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 8),
    [products]
  );

  // Top by margin
  const topByMargin = useMemo(() =>
    [...products]
      .filter((p) => p.costPrice > 0)
      .map((p) => ({ ...p, margin: calcMargin(p.salePrice, p.costPrice) }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 8),
    [products]
  );

  // Insights
  const insights = useMemo(() => {
    const highStock = products.filter((p) => getTotalStock(p) > 20);
    const lowMargin = products.filter((p) => p.costPrice > 0 && calcMargin(p.salePrice, p.costPrice) < 10);
    const outOfStock = products.filter((p) => getTotalStock(p) === 0);
    const mostProfitable = [...products]
      .filter((p) => p.costPrice > 0)
      .sort((a, b) => calcMargin(b.salePrice, b.costPrice) - calcMargin(a.salePrice, a.costPrice))[0];
    const richestCategory = byCategory[0];
    const richestBrand = byBrand[0];
    return { highStock, lowMargin, outOfStock, mostProfitable, richestCategory, richestBrand };
  }, [products, byCategory, byBrand]);

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-slate-600 font-semibold">No hay datos para analizar</p>
          <p className="text-slate-400 text-sm">Agrega productos a tu inventario para ver estadísticas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="Valor en Inventario (costo)"
          value={`$${formatCOP(stats.totalCostValue)}`}
          icon={<DollarSign className="w-5 h-5 text-violet-600" />}
          color="bg-violet-100"
          sub="Basado en precio de costo"
        />
        <StatCard
          label="Valor Potencial de Venta"
          value={`$${formatCOP(stats.totalSaleValue)}`}
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          color="bg-blue-100"
          sub="Basado en precio de venta"
        />
        <StatCard
          label="Ganancia Potencial"
          value={`$${formatCOP(stats.totalProfit)}`}
          icon={<Star className="w-5 h-5 text-emerald-600" />}
          color="bg-emerald-100"
          trend={`${formatPercent(stats.avgMargin)} margen`}
        />
        <StatCard
          label="Margen Promedio"
          value={formatPercent(stats.avgMargin)}
          icon={<Target className="w-5 h-5 text-amber-600" />}
          color="bg-amber-100"
        />
        <StatCard
          label="Total de Productos"
          value={String(stats.totalProducts)}
          icon={<Package className="w-5 h-5 text-pink-600" />}
          color="bg-pink-100"
          sub="Referencias distintas"
        />
        <StatCard
          label="Unidades en Stock"
          value={String(stats.totalStock)}
          icon={<Layers className="w-5 h-5 text-indigo-600" />}
          color="bg-indigo-100"
          sub="Total de piezas"
        />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {insights.outOfStock.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Sin Stock</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{insights.outOfStock.length}</p>
            <p className="text-xs text-red-500 mt-0.5">productos agotados</p>
          </div>
        )}
        {insights.highStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Stock Alto</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{insights.highStock.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">con más de 20 unidades</p>
          </div>
        )}
        {insights.mostProfitable && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Más Rentable</span>
            </div>
            <p className="text-sm font-bold text-emerald-700 truncate">{insights.mostProfitable.name}</p>
            <p className="text-xs text-emerald-500 mt-0.5">
              {formatPercent(calcMargin(insights.mostProfitable.salePrice, insights.mostProfitable.costPrice))} margen
            </p>
          </div>
        )}
        {insights.richestCategory && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold text-violet-700 uppercase tracking-wide">Top Categoría</span>
            </div>
            <p className="text-sm font-bold text-violet-700 truncate">{insights.richestCategory.category}</p>
            <p className="text-xs text-violet-500 mt-0.5">${formatCOP(insights.richestCategory.value)}</p>
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-violet-500" />
            Inventario por Categoría
          </h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byCategory} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${formatCOP(v)}`} width={75} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Valor" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
          )}
        </div>

        {/* Pie Category */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-blue-500" />
            Distribución por Categoría
          </h3>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={byCategory}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`$${formatCOP(Number(v))}`, 'Valor']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Brand Chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-emerald-500" />
            Top Marcas por Valor
          </h3>
          {byBrand.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byBrand} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${formatCOP(v)}`} />
                <YAxis type="category" dataKey="brand" tick={{ fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Valor" fill="#059669" radius={[0, 4, 4, 0]}>
                  {byBrand.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-8">Sin datos</p>
          )}
        </div>

        {/* Price distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 rounded-full bg-amber-500" />
            Distribución de Precios
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={priceRanges} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip prefix="" />} />
              <Bar dataKey="count" name="Productos" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top by stock value */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-600" />
            <h3 className="font-bold text-slate-900">Mayor Valor en Stock</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {topByValue.map((p, i) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-slate-200 text-slate-600' :
                  i === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.brand} · Stock: {p.stock}</p>
                </div>
                <span className="text-sm font-bold text-violet-600">${formatCOP(p.stockValue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top by margin */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Mayor Margen de Ganancia</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {topByMargin.map((p, i) => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                  i === 0 ? 'bg-emerald-100 text-emerald-700' :
                  i === 1 ? 'bg-blue-100 text-blue-600' :
                  i === 2 ? 'bg-violet-100 text-violet-700' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.brand} · ${formatCOP(p.costPrice)} → ${formatCOP(p.salePrice)}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  p.margin >= 30 ? 'bg-emerald-100 text-emerald-700' :
                  p.margin >= 15 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-600'
                }`}>
                  {formatPercent(p.margin)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
