export default function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.06] text-white px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}
