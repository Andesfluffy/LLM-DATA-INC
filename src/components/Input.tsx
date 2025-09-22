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
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-200 mb-1">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-md border px-3 py-2 bg-[#0B0F12]/60 text-gray-100 placeholder:text-gray-500 border-[#2A2D3A] focus:outline-none focus:ring-2 ${error ? "focus:ring-red-500/40 border-red-500/50" : "focus:ring-accent/40"} ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-300">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-gray-400">{helperText}</p>
      ) : null}
    </div>
  );
}
