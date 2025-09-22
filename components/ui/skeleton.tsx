export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-2 py-2 text-left"><Skeleton className="h-4 w-24" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className={r % 2 ? "bg-slate-50" : "bg-white"}>
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c} className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

