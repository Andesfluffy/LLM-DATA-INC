export default function EmptyState({
  title,
  message,
  examples,
  onExampleClick,
}: {
  title: string;
  message?: string;
  examples?: string[];
  onExampleClick?: (example: string) => void;
}) {
  return (
    <div className="text-center py-10 text-grape-400">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-white/[0.04] flex items-center justify-center">
        <svg className="h-6 w-6 text-grape-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        </svg>
      </div>
      <p className="font-semibold text-lg text-white mb-2">{title}</p>
      {message && <p className="text-sm text-grape-400 mb-2">{message}</p>}
      {examples && examples.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="text-grape-500 mb-2">{onExampleClick ? "Click one to try it:" : "Example questions:"}</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {examples.map((e, i) =>
              onExampleClick ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => onExampleClick(e)}
                  className="px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.03] text-grape-300 text-xs transition hover:bg-white/[0.06] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  {e}
                </button>
              ) : (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-grape-300"
                >
                  {e}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
