import { ReactNode, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode };

export default function Card({ children, className = "", ...rest }: CardProps) {
  const base = "rounded-xl border shadow-sm bg-white";
  const merged = className ? `${base} ${className}` : base;
  return (
    <div {...rest} className={merged}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="p-4 border-b">
      <h2 className="text-lg font-semibold">{title}</h2>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

