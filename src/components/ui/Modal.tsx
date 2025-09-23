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
      <div className="absolute inset-0 bg-black/65 backdrop-blur" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-[#2A2D3A] bg-[#0B0F12]/90 p-6 text-slate-100 shadow-xl transition-all duration-200">
        {children}
      </div>
    </div>
  );
}

