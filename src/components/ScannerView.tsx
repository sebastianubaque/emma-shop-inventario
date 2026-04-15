import { useCallback, useEffect, useState } from 'react';
import { Scan, Package, TrendingUp, CheckCircle, PlusCircle, Zap } from 'lucide-react';
import { useScannerInput } from '../hooks/useScanner';
import { useBeep } from '../hooks/useBeep';
import { useInventoryStore } from '../store/inventoryStore';
import { ProductFormFixed } from './ProductFormFixed';
import { formatCOP } from '../utils/format';

export function ScannerView() {
  const {
    scanBarcode,
    addProduct,
    products,
    scanFeedback,
    setScanFeedback,
    lastScannedBarcode,
    showProductForm,
    setShowProductForm,
  } = useInventoryStore();

  const { playBeep } = useBeep();
  const [flashColor, setFlashColor] = useState<'green' | 'blue' | null>(null);
  const [lastProduct, setLastProduct] = useState<typeof products[0] | null>(null);
  const [manualCode, setManualCode] = useState('');

  const handleScan = useCallback(
    async (barcode: string) => {
      const result = await scanBarcode(barcode);
      if (result === 'found') {
        playBeep('success');
        setFlashColor('green');
        const found = products.find((p) => p.barcode === barcode);
        if (found) setLastProduct(found);
        setTimeout(() => setFlashColor(null), 600);
        setTimeout(() => setScanFeedback('idle'), 2000);
      } else {
        playBeep('info');
        setFlashColor('blue');
        setTimeout(() => setFlashColor(null), 400);
        setShowProductForm(true);
      }
    },
    [scanBarcode, playBeep, products, setScanFeedback, setShowProductForm]
  );

  const { inputRef, value, handleKeyDown, handleChange, refocusInput } = useScannerInput(handleScan, {
    enabled: !showProductForm,
  });

  // Re-check products after form close to get latest
  useEffect(() => {
    if (!showProductForm && lastScannedBarcode) {
      const found = products.find((p) => p.barcode === lastScannedBarcode);
      if (found) setLastProduct(found);
    }
  }, [showProductForm, products, lastScannedBarcode]);

  const handleSaveProduct = useCallback(
    async (data: Parameters<typeof addProduct>[0]) => {
      await addProduct(data);
      playBeep('success');
      setFlashColor('green');
      setShowProductForm(false);
      setTimeout(() => setFlashColor(null), 600);
      setTimeout(() => refocusInput(), 100);
    },
    [addProduct, playBeep, setShowProductForm, refocusInput]
  );

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <>
      {/* Flash overlay */}
      {flashColor && (
        <div
          className={`fixed inset-0 z-40 pointer-events-none transition-opacity duration-300 ${
            flashColor === 'green' ? 'bg-emerald-400/20' : 'bg-violet-400/20'
          }`}
        />
      )}

      {showProductForm && (
        <ProductFormFixed
          initialBarcode={lastScannedBarcode || ''}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowProductForm(false);
            setTimeout(() => refocusInput(), 100);
          }}
        />
      )}

      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        {/* Scanner Input Area */}
        <div
          className={`relative rounded-2xl p-6 transition-all duration-300 border-2 ${
            scanFeedback === 'updated'
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-violet-200 bg-white'
          } shadow-lg`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Modo Escáner</h2>
              <p className="text-sm text-slate-500">Escanea un código de barras o escribe manualmente</p>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold">Activo</span>
              </div>
            </div>
          </div>

          {/* Hidden scanner input - always focused */}
          <input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            aria-label="Scanner input"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />

          {/* Visual input display */}
          <div
            className="w-full px-4 py-4 border-2 border-dashed border-violet-300 rounded-xl bg-violet-50 
              flex items-center gap-3 cursor-text min-h-[60px]"
            onClick={() => refocusInput()}
          >
            <Scan className="w-5 h-5 text-violet-400 flex-shrink-0" />
            <span className="text-slate-400 text-sm font-medium">
              {value || 'Esperando escaneo... apunta y escanea el producto'}
            </span>
            {value && (
              <span className="ml-auto font-mono text-violet-700 font-bold">{value}</span>
            )}
          </div>

          {/* Manual entry */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleManualSearch();
              }}
              placeholder="Buscar por código manualmente..."
              className="flex-1 px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900
                focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all"
            />
            <button
              onClick={handleManualSearch}
              className="px-4 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors"
            >
              Buscar
            </button>
            <button
              onClick={() => setShowProductForm(true)}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Nuevo
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {scanFeedback === 'updated' && lastProduct && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-4 flex items-center gap-3 animate-bounce-once">
            <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="font-bold text-emerald-800">{lastProduct.name}</p>
              <p className="text-sm text-emerald-600">
                Stock actualizado → <strong>{lastProduct.stock}</strong> unidades · ${formatCOP(lastProduct.salePrice)}
              </p>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-violet-600">{products.length}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Productos</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {products.reduce((s, p) => s + p.stock, 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Unidades</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-lg font-bold text-blue-600">
              ${formatCOP(products.reduce((s, p) => s + p.salePrice * p.stock, 0))}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Valor total</div>
          </div>
        </div>

        {/* Recent Products */}
        {recentProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-700">Últimos Escaneados</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {recentProducts.map((product) => (
                <div key={product.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                    <p className="text-xs text-slate-400">{product.brand} · {product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">${formatCOP(product.salePrice)}</p>
                    <p className="text-xs text-slate-400">
                      Stock: <span className="font-semibold text-slate-600">{product.stock}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5" />
            <h3 className="font-bold">Atajos de Teclado</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">F2</kbd>
              <span className="text-white/80">Ir a Inventario</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">F3</kbd>
              <span className="text-white/80">Dashboard</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">F1</kbd>
              <span className="text-white/80">Modo Escáner</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs font-mono">ESC</kbd>
              <span className="text-white/80">Cerrar formulario</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
