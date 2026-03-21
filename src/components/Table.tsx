type Props = {
  fields: string[];
  rows: Record<string, any>[];
  className?: string;
};

export default function Table({ fields, rows, className = "" }: Props) {
  return (
    <div className={`overflow-x-auto border border-white/[0.06] rounded-xl bg-white/[0.01] backdrop-blur-md ${className}`}>
      <table className="min-w-full text-xs sm:text-sm" role="table">
        <thead className="sticky top-0">
          <tr>
            {fields.map((h) => (
              <th
                key={h}
                scope="col"
                className="whitespace-nowrap text-left px-3 py-2.5 sm:px-4 sm:py-3 border-b border-white/[0.08] text-white bg-white/[0.05] font-semibold tracking-tight backdrop-blur-xl text-xs uppercase"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`row-${i}-${fields.slice(0, 3).map((f) => String((r as any)[f] ?? "")).join("|")}`}
              className={`${i % 2 ? "bg-white/[0.03]" : "bg-transparent"} hover:bg-white/[0.06] transition-colors animate-fade-in`}
            >
              {fields.map((h) => (
                <td
                  key={h}
                  className="max-w-[260px] px-3 py-2.5 sm:px-4 sm:py-3 align-top border-b border-white/[0.06] font-mono text-grape-100 break-words whitespace-pre-wrap"
                >
                  {formatCell((r as any)[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return <span className="text-grape-500 italic">null</span>;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
