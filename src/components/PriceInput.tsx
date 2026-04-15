import React, { useState, useCallback } from 'react';
import { formatPriceInput, parsePriceInput } from '../utils/format';

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  id?: string;
}

export function PriceInput({
  value,
  onChange,
  label,
  placeholder = '0',
  className = '',
  autoFocus = false,
  onKeyDown,
  id,
}: PriceInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    value > 0 ? formatPriceInput(String(value)) : ''
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = formatPriceInput(raw);
      setDisplayValue(formatted);
      onChange(parsePriceInput(formatted));
    },
    [onChange]
  );

  // Sync external value changes
  React.useEffect(() => {
    setDisplayValue(value > 0 ? formatPriceInput(String(value)) : '');
  }, [value]);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm pointer-events-none">
          $
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-7 pr-3 py-2.5 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold text-base
            focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100
            transition-all duration-150 bg-white placeholder-slate-300"
        />
      </div>
    </div>
  );
}
