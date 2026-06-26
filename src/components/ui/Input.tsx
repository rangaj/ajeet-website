import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { mergeFocusHandlers, scrollFieldIntoViewOnFocus } from "@/lib/mobile-form-focus";
import { COUNTRY_DIAL_CODES, splitE164, toE164 } from "@/constants/country-codes";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, className, id, onFocus, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-800">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-base shadow-sm transition-colors sm:text-sm",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-200",
          error && "border-red-300",
          className
        )}
        onFocus={mergeFocusHandlers(onFocus, scrollFieldIntoViewOnFocus)}
        {...props}
      />
      {hint && !error && <p className="text-xs text-brand-600">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface PasswordInputProps extends Omit<InputProps, "type"> {}

export function PasswordInput({ label, hint, error, className, id, onFocus, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-800">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={cn(
            "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 pr-11 text-base shadow-sm transition-colors sm:text-sm",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-200",
            error && "border-red-300",
            className
          )}
          onFocus={mergeFocusHandlers(onFocus, scrollFieldIntoViewOnFocus)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-600 hover:bg-surface-muted hover:text-brand-800"
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      {hint && !error && <p className="text-xs text-brand-600">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface PhoneInputProps {
  label?: string;
  /** Stored value in E.164 form (e.g. +919876543210) or "". */
  value: string;
  /** Emits the combined E.164 string ("" when no national number is entered). */
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  id?: string;
}

export function PhoneInput({ label, value, onChange, hint, error, id }: PhoneInputProps) {
  const [initial] = useState(() => splitE164(value));
  const [iso, setIso] = useState(initial.iso);
  const [national, setNational] = useState(initial.national);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  const handleIso = (nextIso: string) => {
    setIso(nextIso);
    onChange(toE164(nextIso, national));
  };

  const handleNational = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setNational(digits);
    onChange(toE164(iso, digits));
  };

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-800">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={iso}
          onChange={(e) => handleIso(e.target.value)}
          className={cn(
            "w-28 shrink-0 rounded-xl border border-surface-border bg-white px-2 py-2.5 text-base shadow-sm transition-colors sm:text-sm",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-200",
            error && "border-red-300"
          )}
        >
          {COUNTRY_DIAL_CODES.map((c) => (
            <option key={`${c.iso}-${c.dial}`} value={c.iso}>
              {c.iso} {c.dial}
            </option>
          ))}
        </select>
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={national}
          onChange={handleNational}
          onFocus={scrollFieldIntoViewOnFocus}
          className={cn(
            "min-w-0 flex-1 rounded-xl border border-surface-border bg-white px-3 py-2.5 text-base shadow-sm transition-colors sm:text-sm",
            "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-200",
            error && "border-red-300"
          )}
          placeholder="Mobile number"
        />
      </div>
      {hint && !error && <p className="text-xs text-brand-600">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, onFocus, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-800">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-base shadow-sm transition-colors sm:text-sm",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-200",
          className
        )}
        onFocus={mergeFocusHandlers(onFocus, scrollFieldIntoViewOnFocus)}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, options, className, id, error, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-brand-800">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          "w-full rounded-xl border border-surface-border bg-white px-3 py-2.5 text-base shadow-sm transition-colors sm:text-sm",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-gold-200",
          error && "border-red-300",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
