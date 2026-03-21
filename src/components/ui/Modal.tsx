"use client";
import React, { ReactNode, useEffect, useRef, useCallback } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional title for aria-labelledby */
  title?: string;
};

export default function Modal({ open, onClose, children, title }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Escape key handler
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
    }
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Focus trap + restore focus on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the dialog after animation starts
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (focusable || dialogRef.current)?.focus();
      });

      // Prevent body scroll
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Focus trap: cycle focus within modal
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;

    const focusableEls = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableEls.length === 0) return;

    const first = focusableEls[0]!;
    const last = focusableEls[focusableEls.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 sm:py-12"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop with fade animation */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto transform rounded-2xl border border-white/[0.08] bg-[#0d0d0d] p-5 sm:p-8 text-grape-200 shadow-2xl backdrop-blur-xl animate-scale-in"
      >
        {children}
      </div>
    </div>
  );
}
