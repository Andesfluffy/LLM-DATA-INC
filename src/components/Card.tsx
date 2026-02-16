import { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-6 backdrop-blur-md ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="pb-4 mb-2 border-b border-white/[0.06]">
      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-0.5">
        {title}
      </h2>
      {subtitle && <p className="text-sm text-grape-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`pt-2 pb-4 text-grape-300 ${className}`}>{children}</div>
  );
}
