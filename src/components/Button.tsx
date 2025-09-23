import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
};

export default function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold transition-all border border-accent/80 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-tr from-accent/90 to-primary text-white hover:from-accent hover:to-primary/90 border-accent shadow-[0_6px_18px_rgba(249,115,22,0.28)]"
      : variant === "accent"
      ? "bg-accent/20 text-accent hover:bg-accent/30 border-accent"
      : variant === "ghost"
      ? "bg-transparent text-slate-100 hover:bg-accent/10 border-accent/60"
      : "bg-transparent text-accent hover:bg-accent/10 border-accent";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
