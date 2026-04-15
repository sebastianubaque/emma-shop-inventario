import { Scan, List, BarChart2, Baby, Download } from 'lucide-react';
import { useInventoryStore } from '../store/inventoryStore';
import { ViewMode } from '../types';
import { exportToCSV, downloadFile } from '../utils/format';

const NAV_ITEMS: { view: ViewMode; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { view: 'scanner', label: 'Escáner', icon: <Scan className="w-5 h-5" />, shortcut: 'F1' },
  { view: 'inventory', label: 'Inventario', icon: <List className="w-5 h-5" />, shortcut: 'F2' },
  { view: 'dashboard', label: 'Dashboard', icon: <BarChart2 className="w-5 h-5" />, shortcut: 'F3' },
];

export function Navbar() {
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
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Baby className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-slate-900 leading-tight">BabyStock</div>
            <div className="text-[10px] text-slate-400 leading-tight">Inventario Bebés</div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ view, label, icon, shortcut }) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all ${
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

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {products.length} productos
          </div>
          <button
            onClick={handleExport}
            disabled={products.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm
              hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
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
