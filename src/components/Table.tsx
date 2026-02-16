type Props = {
  fields: string[];
  rows: Record<string, any>[];
  className?: string;
};

export default function Table({ fields, rows, className = "" }: Props) {
  return (
    <div className={`overflow-x-auto border border-white/[0.06] rounded-xl bg-white/[0.01] backdrop-blur-md ${className}`}>
      <table className="min-w-[560px] sm:min-w-full text-xs sm:text-sm">
        <thead className="sticky top-0">
          <tr>
            {fields.map((h) => (
              <th
                key={h}
                className="whitespace-nowrap text-left px-3 py-2.5 sm:px-4 sm:py-3 border-b border-white/[0.06] text-grape-300 bg-white/[0.02] font-semibold tracking-tight backdrop-blur-xl"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`${i % 2 ? "bg-white/[0.015]" : "bg-transparent"} animate-fade-in`}>
              {fields.map((h) => (
                <td key={h} className="max-w-[220px] px-3 py-2.5 sm:px-4 sm:py-3 align-top border-b border-white/[0.04] font-mono text-grape-200 break-words whitespace-pre-wrap">
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
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
