import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
};

type ButtonVariant = NonNullable<ButtonProps["variant"]>;

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-gradient-to-r from-[rgb(var(--accent))] to-[#ff8a3d] text-[#0B0F12] shadow-[0_12px_28px_rgba(249,115,22,0.32)] hover:from-[#ff7a20] hover:to-[#ff9642]",
  secondary:
    "border border-[rgba(249,115,22,0.55)] bg-[rgba(249,115,22,0.14)] text-white hover:bg-[rgba(249,115,22,0.22)] hover:border-[rgba(249,115,22,0.85)]",
  accent:
    "border border-[rgba(236,237,240,0.28)] bg-white/8 text-white hover:border-[rgba(249,115,22,0.6)] hover:bg-[rgba(249,115,22,0.18)]",
  ghost:
    "border border-transparent text-slate-200 hover:bg-white/10 hover:text-white",
};

export function buttonClassName({
  variant = "primary",
  className = "",
}: {
  variant?: ButtonVariant;
  className?: string;
} = {}) {
  return [baseClasses, variantClasses[variant], className].filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName({ variant, className })} {...props}>
      {children}
    </button>
  );
}
