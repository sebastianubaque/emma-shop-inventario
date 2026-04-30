import { useEffect, useCallback } from 'react';
import { useInventoryStore } from './store/inventoryStore';
import { NavbarFixed } from './components/NavbarFixed';
import { ScannerView } from './components/ScannerView';
import { InventoryView } from './components/InventoryView';
import { DashboardView } from './components/DashboardView';

export default function App() {
  const { currentView, setView, loadProducts } = useInventoryStore();

  useEffect(() => {
    document.title = 'Emma Shop Inventario';
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'F1':
          e.preventDefault();
          setView('scanner');
          break;
        case 'F2':
          e.preventDefault();
          setView('inventory');
          break;
        case 'F3':
          e.preventDefault();
          setView('dashboard');
          break;
      }
    },
    [setView]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <NavbarFixed />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {currentView === 'scanner' && <ScannerView />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'dashboard' && <DashboardView />}
      </main>
      <footer className="text-center py-3 text-xs text-slate-400 border-t border-slate-100 bg-white">
        Emma Shop Inventario · versión 2.2
      </footer>
    </div>
  );
}
