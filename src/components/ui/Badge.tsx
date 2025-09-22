export default function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full bg-gradient-to-tr from-blue-700 to-pink-500 text-white px-3 py-1 text-xs font-semibold shadow ${className}`}>{children}</span>;
}

