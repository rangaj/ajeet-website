import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { mergeFocusHandlers, scrollFieldIntoViewOnFocus } from "@/lib/mobile-form-focus";
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
