import { useEffect, useRef, useCallback, useState } from 'react';

interface UseScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  scanDelay?: number; // ms between chars to detect scanner vs manual
  enabled?: boolean;
}

/**
 * Hook to detect barcode scanner input (HID keyboard emulation)
 * Scanners typically type very fast (< 50ms between chars) and end with Enter
 */
export function useScanner({
  onScan,
  minLength = 3,
  scanDelay = 50,
  enabled = true,
}: UseScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;

      // Reset buffer if too much time has passed (manual typing)
      if (timeSinceLastKey > 300 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          onScan(code);
        }
        bufferRef.current = '';
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Clear timeout and reset
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan, minLength, scanDelay, enabled]);
}

/**
 * Hook for the scanner input field - detects scan vs manual entry
 */
export function useScannerInput(
  onScan: (barcode: string) => void,
  options?: { enabled?: boolean }
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const enabled = options?.enabled ?? true;

  // Keep focus on the input
  const refocusInput = useCallback(() => {
    if (enabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Auto-focus on mount
    refocusInput();

    // Refocus if window regains focus
    const handleWindowFocus = () => refocusInput();
    window.addEventListener('focus', handleWindowFocus);

    // Refocus on any click on the page
    const handleClick = () => setTimeout(refocusInput, 50);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleClick);
    };
  }, [enabled, refocusInput]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const code = value.trim();
        if (code.length >= 3) {
          onScan(code);
          setValue('');
        }
      }
    },
    [value, onScan]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  return {
    inputRef,
    value,
    setValue,
    handleKeyDown,
    handleChange,
    refocusInput,
  };
}
