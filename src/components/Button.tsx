import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
};

type ButtonVariant = NonNullable<ButtonProps["variant"]>;

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-[#0B0F12] shadow-[0_8px_18px_rgba(249,115,22,0.28)] hover:bg-[rgb(var(--accent))]/90 hover:shadow-[0_10px_24px_rgba(249,115,22,0.32)]",
  secondary:
    "border border-[rgb(var(--accent))] bg-transparent text-[rgb(var(--accent))] hover:bg-[rgba(249,115,22,0.12)]",
  accent:
    "border border-[rgba(236,237,240,0.35)] bg-[rgb(var(--primary))] text-[rgb(var(--fg))] hover:border-[rgb(var(--accent))] hover:text-white",
  ghost:
    "border border-transparent bg-transparent text-[rgb(var(--fg))] hover:bg-white/10",
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
