import React from "react";

export default function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-200 mb-1">
      {children}
    </label>
  );
}

