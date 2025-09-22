import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
};

export default function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg";
  const styles = variant === "primary"
    ? "bg-gradient-to-tr from-primary to-accent text-white hover:brightness-110 border-none shadow-[0_8px_20px_rgba(249,115,22,0.25)]"
    : variant === "accent"
    ? "bg-accent text-white hover:bg-orange-600 border-none shadow-[0_8px_20px_rgba(249,115,22,0.25)]"
    : variant === "ghost"
    ? "text-gray-100 hover:bg-[#2A2D3A] border-none"
    : "border border-accent text-accent bg-transparent hover:bg-accent/10";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}
