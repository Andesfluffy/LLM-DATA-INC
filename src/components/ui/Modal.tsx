"use client";
import React, { ReactNode, useEffect } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    if (open) {
      document.addEventListener("keydown", onKey);
    }

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 sm:py-12">
      <div className="absolute inset-0 bg-black/65 backdrop-blur" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md transform rounded-3xl border border-[#2A2D3A] bg-[#0B0F12]/85 p-8 text-slate-100 shadow-[0_24px_64px_rgba(0,0,0,0.55)] transition-all duration-200 md:translate-y-4"
      >
        {children}
      </div>
    </div>
  );
}
