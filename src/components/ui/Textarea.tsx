import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string; helperText?: string };

export default function Textarea({ className = "", error, helperText, ...props }: Props) {
  return (
    <div>
      <textarea
        className={`w-full rounded-xl border px-4 py-3 bg-[#23263a]/60 text-slate-100 border-[#23263a]/40 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-lg backdrop-blur-xl ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-pink-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

