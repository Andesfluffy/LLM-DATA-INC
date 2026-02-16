import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost";
};

type ButtonVariant = NonNullable<ButtonProps["variant"]>;

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold tracking-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-white text-black hover:bg-gray-200",
  secondary:
    "border border-white/[0.1] bg-white/[0.04] text-grape-200 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white",
  accent:
    "border border-white/[0.08] bg-transparent text-grape-300 hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white",
  ghost:
    "border border-transparent text-grape-400 hover:bg-white/[0.04] hover:text-white",
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
