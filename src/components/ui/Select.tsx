import React from "react";

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; helperText?: string; error?: string };

export default function Select({ label, helperText, error, className = "", id, children, ...props }: Props) {
  const inputId = id || props.name || undefined;
  return (
    <div>
  {label && <label htmlFor={inputId} className="block text-sm font-semibold text-slate-200 mb-1">{label}</label>}
  <select id={inputId} className={`w-full rounded-xl border px-4 py-3 bg-[#23263a]/60 text-slate-100 border-[#23263a]/40 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-lg backdrop-blur-xl ${className}`} {...props}>
        {children}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-pink-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

