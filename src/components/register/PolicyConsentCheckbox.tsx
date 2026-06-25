import { Link } from "react-router-dom";

export function PolicyConsentCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          I agree to the{" "}
          <Link
            to="/privacy"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 hover:underline"
          >
            Privacy Policy
          </Link>
          ,{" "}
          <Link
            to="/terms"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 hover:underline"
          >
            Terms of Use
          </Link>
          ,{" "}
          <Link
            to="/directory-usage"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 hover:underline"
          >
            Directory Usage Policy
          </Link>
          , and{" "}
          <Link
            to="/disclaimer"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 hover:underline"
          >
            Disclaimer
          </Link>
          .
        </span>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
