import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

type ButtonVariant = NonNullable<ButtonProps["variant"]>;
type ButtonSize = NonNullable<ButtonProps["size"]>;

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2 text-sm gap-2 rounded-lg",
  lg: "px-5 py-2.5 text-base gap-2.5 rounded-xl",
};

const baseClasses =
  "inline-flex items-center justify-center font-semibold tracking-tight transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-transparent bg-white text-black hover:bg-gray-100 hover:shadow-lg hover:shadow-white/10",
  secondary:
    "border border-white/[0.1] bg-white/[0.04] text-grape-200 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white",
  accent:
    "border border-white/[0.08] bg-transparent text-grape-300 hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white",
  ghost:
    "border border-transparent text-grape-400 hover:bg-white/[0.04] hover:text-white",
  danger:
    "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-500/40",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return [baseClasses, sizeClasses[size], variantClasses[variant], className].filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonClassName({ variant, size, className })} {...props}>
      {children}
    </button>
  );
}
