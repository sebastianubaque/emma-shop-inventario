import { useCallback, useEffect, useRef, useState } from 'react';
import { Scan, Package, TrendingUp, CheckCircle, PlusCircle, Zap, Camera, X, QrCode, Wand2, Plus, Minus } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat, NotFoundException } from '@zxing/library';
import { useScannerInput } from '../hooks/useScanner';
import { useBeep } from '../hooks/useBeep';
import { useInventoryStore } from '../store/inventoryStore';
import { getTotalStock } from '../types';
import { ProductFormFixed } from './ProductFormFixed';
import { formatCOP } from '../utils/format';

type IScannerControls = { stop: () => void };

const ZXING_HINTS = new Map<DecodeHintType, unknown>([
  [
    DecodeHintType.POSSIBLE_FORMATS,
    [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ],
  ],
  [DecodeHintType.TRY_HARDER, true],
]);

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
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'starting' | 'scanning'>('idle');
  const [scanSuccess, setScanSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const hasScannedRef = useRef(false);

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

  const stopCameraScanner = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch { /* ignore */ }
      controlsRef.current = null;
    }
    hasScannedRef.current = false;
    setCameraStatus('idle');
  }, []);

  const startCameraScanner = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Tu navegador no permite acceso a la cámara. Usa Chrome o Safari actualizado.');
      return;
    }

    setCameraError('');
    setScanSuccess(false);
    hasScannedRef.current = false;
    setShowCameraScanner(true);
    setCameraStatus('starting');

    // Small delay so the modal + video element render before we attach the stream
    await new Promise<void>((resolve) => setTimeout(resolve, 120));

    try {
      const reader = new BrowserMultiFormatReader(ZXING_HINTS, {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 500,
      });

      if (!videoRef.current) throw new Error('Video element not ready');

      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        async (result, error) => {
          if (result && !hasScannedRef.current) {
            hasScannedRef.current = true;
            const code = result.getText().trim();
            if (!code) return;

            setScanSuccess(true);
            stopCameraScanner();

            setTimeout(() => {
              setShowCameraScanner(false);
              setScanSuccess(false);
            }, 500);

            setManualCode(code);
            await handleScan(code);
            return;
          }
          if (error && !(error instanceof NotFoundException)) {
            console.warn('ZXing scan error:', error);
          }
        }
      );

      controlsRef.current = controls as IScannerControls;
      setCameraStatus('scanning');
    } catch (error) {
      console.error('Camera start error:', error);
      stopCameraScanner();
      setShowCameraScanner(false);

      const msg = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado. Ve a Configuración del navegador y permite el acceso.'
        : 'No se pudo abrir la cámara. Revisa los permisos e intenta de nuevo.';
      setCameraError(msg);
    }
  }, [handleScan, stopCameraScanner]);

  useEffect(() => () => stopCameraScanner(), [stopCameraScanner]);

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
      void handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Productos con código automático: 6 dígitos de fecha + letras (ej: 300426CARBODY)
  const AUTO_BARCODE_RE = /^\d{6}[A-Z]{3}.+/;
  const autoCodeProducts = products.filter((p) => AUTO_BARCODE_RE.test(p.barcode));

  const [showAutoPanel, setShowAutoPanel] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleQuickAddStock = useCallback(
    async (productId: string) => {
      const { incrementStock } = useInventoryStore.getState();
      await incrementStock(productId);
      playBeep('success');
      setJustAdded(productId);
      setTimeout(() => setJustAdded(null), 1200);
    },
    [playBeep]
  );

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

          {/* Camera scan button — prominent */}
          <button
            type="button"
            onClick={() => void startCameraScanner()}
            className="mt-4 w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl
              bg-sky-600 text-white font-bold text-base
              hover:bg-sky-700 active:scale-[0.98] transition-all duration-150
              shadow-lg shadow-sky-200 focus-visible:ring-4 focus-visible:ring-sky-300 min-h-[56px]"
            aria-label="Escanear con la cámara del teléfono"
          >
            <Camera className="w-5 h-5" />
            Escanear con Cámara
            <QrCode className="w-5 h-5 opacity-70" />
          </button>

          {/* Manual entry + action buttons */}
          <div className="mt-3 flex flex-col gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch(); }}
              placeholder="Buscar por código manualmente..."
              className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-900
                focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 transition-all min-h-11"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleManualSearch}
                className="flex items-center justify-center px-4 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 transition-colors min-h-11"
              >
                Buscar
              </button>
              <button
                onClick={() => setShowProductForm(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors min-h-11"
              >
                <PlusCircle className="w-4 h-4" />
                Nuevo
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="mt-3 flex gap-2 items-start text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <p>{cameraError}</p>
            </div>
          )}
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
              {products.reduce((s, p) => s + getTotalStock(p), 0)}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Unidades</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <div className="text-lg font-bold text-blue-600">
              ${formatCOP(products.reduce((s, p) => s + p.salePrice * getTotalStock(p), 0))}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Valor total</div>
          </div>
        </div>

        {/* Auto-code products panel */}
        {autoCodeProducts.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAutoPanel((v) => !v)}
              className="w-full px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4 text-violet-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-slate-800">Productos sin código real</p>
                <p className="text-xs text-slate-500">{autoCodeProducts.length} producto{autoCodeProducts.length !== 1 ? 's' : ''} con código automático · toca para agregar unidades</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${showAutoPanel ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'}`}>
                {showAutoPanel ? 'Cerrar' : 'Ver'}
              </span>
            </button>

            {showAutoPanel && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {autoCodeProducts.map((product) => {
                  const added = justAdded === product.id;
                  return (
                    <div key={product.id} className={`px-5 py-3 flex items-center gap-3 transition-colors ${added ? 'bg-emerald-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{product.name}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {product.brand}{product.size ? ` · ${product.size}` : ''} · {product.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold min-w-8 text-center transition-colors ${added ? 'text-emerald-600' : 'text-slate-700'}`}>
                          {getTotalStock(product)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuickAddStock(product.id)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all active:scale-95 shadow-sm ${
                            added
                              ? 'bg-emerald-500 text-white shadow-emerald-200'
                              : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-200'
                          }`}
                          title="Agregar una unidad"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
                      Stock: <span className="font-semibold text-slate-600">{getTotalStock(product)}</span>
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

      {/* ── Camera Scanner Modal ── */}
      {showCameraScanner && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Escáner de cámara"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center">
                <Camera className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base leading-tight">Escanear código</h3>
                <p className="text-slate-400 text-xs">QR · EAN-13 · Code-128 · UPC y más</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { stopCameraScanner(); setShowCameraScanner(false); }}
              className="w-10 h-10 rounded-xl bg-white/10 text-white hover:bg-white/20 active:scale-95
                flex items-center justify-center transition-all"
              aria-label="Cerrar escáner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video area */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              playsInline
            />

            {/* Dark vignette overlay */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)',
              }}
            />

            {/* Scanning frame */}
            <div className="relative w-72 h-44 pointer-events-none">
              {/* Corner markers */}
              <div className={`absolute inset-0 animate-corner-pulse`}>
                {/* Top-left */}
                <span className="absolute top-0 left-0 w-7 h-7 border-t-3 border-l-3 border-sky-400 rounded-tl-lg" style={{ borderWidth: '3px 0 0 3px' }} />
                {/* Top-right */}
                <span className="absolute top-0 right-0 w-7 h-7 border-t-3 border-r-3 border-sky-400 rounded-tr-lg" style={{ borderWidth: '3px 3px 0 0' }} />
                {/* Bottom-left */}
                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-3 border-l-3 border-sky-400 rounded-bl-lg" style={{ borderWidth: '0 0 3px 3px' }} />
                {/* Bottom-right */}
                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-3 border-r-3 border-sky-400 rounded-br-lg" style={{ borderWidth: '0 3px 3px 0' }} />
              </div>

              {/* Scan line */}
              {cameraStatus === 'scanning' && !scanSuccess && (
                <div className="absolute left-2 right-2 top-0 animate-scan-line pointer-events-none">
                  <div className="h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-90 rounded-full shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]" />
                </div>
              )}

              {/* Success overlay */}
              {scanSuccess && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-500/30 border-2 border-emerald-400">
                  <CheckCircle className="w-10 h-10 text-emerald-300" />
                </div>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="flex-shrink-0 px-5 py-4 border-t border-white/10">
            <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center">
              {cameraStatus === 'starting' ? (
                <p className="text-sm font-medium text-slate-300 flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin inline-block" />
                  Abriendo cámara...
                </p>
              ) : scanSuccess ? (
                <p className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  ¡Código detectado!
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">
                    Apunta la cámara al código
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mantén el teléfono estable · El código se leerá automáticamente
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
