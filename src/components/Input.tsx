import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export default function Input({ label, helperText, error, className = "", id, ...props }: InputProps) {
  const inputId = id || props.name || undefined;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-grape-200 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-xl border px-4 py-2.5 bg-white/[0.03] text-grape-100 placeholder:text-grape-500 border-white/[0.08] focus:outline-none focus:ring-2 focus:border-white/[0.15] transition-colors ${error ? "focus:ring-red-400/40 border-red-400/50" : "focus:ring-white/[0.1]"} ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-grape-500">{helperText}</p>
      ) : null}
    </div>
  );
}
