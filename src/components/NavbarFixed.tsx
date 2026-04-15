import { Scan, List, BarChart2, Download } from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { ViewMode } from '../types';
import { exportToCSV, downloadFile } from '../utils/format';
import logoEmmaWhite from '../assets/logo-emma-icon-white.png';

const NAV_ITEMS: { view: ViewMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { view: 'scanner', label: 'Escaner', icon: <Scan className="w-5 h-5" />, shortcut: 'F1' },
  { view: 'inventory', label: 'Inventario', icon: <List className="w-5 h-5" />, shortcut: 'F2' },
  { view: 'dashboard', label: 'Dashboard', icon: <BarChart2 className="w-5 h-5" />, shortcut: 'F3' },
];

export function NavbarFixed() {
  const { currentView, setView, products } = useInventoryStore();

  const handleExport = () => {
    const csv = exportToCSV(products.map((p) => ({
      name: p.name,
      brand: p.brand,
      salePrice: p.salePrice,
      category: p.category,
      barcode: p.barcode,
      stock: p.stock,
    })));
    downloadFile(csv, `inventario-bebes-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        <div className="mr-2 shrink-0">
          <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-2.5 py-2 shadow-[0_10px_30px_rgba(124,58,237,0.10)]">
            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-indigo-600">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)]" />
              <img
                src={logoEmmaWhite}
                alt="Emma Shop"
                className="relative h-7 w-7 object-contain"
              />
            </div>
            <div className="hidden sm:block leading-none">
              <div className="text-[0.95rem] font-black tracking-[0.18em] text-slate-900">EMMA SHOP</div>
              <div className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.28em] text-violet-500">
                inventario de la tienda
              </div>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map(({ view, label, icon, shortcut }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                currentView === view
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
              <span className="hidden lg:inline text-xs opacity-60">({shortcut})</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {products.length} productos
          </div>
          <button
            onClick={handleExport}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            title="Exportar CSV para Treinta"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Treinta</span>
          </button>
        </div>
      </div>
    </header>
  );
}
