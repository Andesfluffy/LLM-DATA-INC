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
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto transform rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5 sm:p-8 text-grape-200 shadow-2xl transition-all duration-200 backdrop-blur-xl"
      >
        {children}
      </div>
    </div>
  );
}
