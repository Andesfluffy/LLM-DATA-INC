export default function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="text-center py-10 text-gray-600">
      <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400"><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>
      </div>
      <p className="font-medium">{title}</p>
      {message && <p className="text-sm mt-1">{message}</p>}
    </div>
  );
}

