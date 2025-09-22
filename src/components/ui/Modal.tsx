"use client";
import React, { ReactNode, useEffect } from "react";

export default function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative bg-[#23263a]/80 text-slate-200 rounded-3xl shadow-2xl border border-pink-500/30 p-8 w-full max-w-lg animate-fade-in backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

