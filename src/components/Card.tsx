import { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string };

export default function Card({ children, className = "", ...rest }: CardProps) {
  const inner = className ? `card rounded-2xl border border-[#2A2D3A] ${className}` : "card rounded-2xl border border-[#2A2D3A]";
  return (
    <div {...rest} className="rounded-2xl p-[1.5px] bg-gradient-to-tr from-accent/70 via-accent/20 to-transparent">
      <div className={inner}>{children}</div>
    </div>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-4 mb-2 border-b border-[#2A2D3A]">
      <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow mb-1 heading-font">{title}</h2>
      {subtitle && <p className="text-sm text-gray-300 mt-1">{subtitle}</p>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`pt-2 pb-4 text-gray-100 ${className}`}>{children}</div>;
}
