export default function EmptyState({ title, message, examples }: { title: string; message?: string; examples?: string[] }) {
  return (
    <div className="text-center py-10 text-gray-300">
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-accent/15 flex items-center justify-center text-2xl text-accent">📊</div>
      <p className="font-semibold text-lg text-white mb-2">{title}</p>
      {message && <p className="text-sm text-gray-400 max-w-md mx-auto">{message}</p>}
      {examples && examples.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="text-gray-400 mb-1">Try:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {examples.map((e, i)=>(<span key={i} className="px-2 py-1 rounded-full border border-[#2A2D3A] bg-[#0B0F12]/50 text-gray-200">{e}</span>))}
          </div>
        </div>
      )}
    </div>
  );
}

