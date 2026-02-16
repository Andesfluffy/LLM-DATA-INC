import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 text-8xl font-bold gradient-text">404</div>
      <p className="text-grape-200 text-lg mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-white/[0.1] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.15] shadow-lg shadow-black/20"
      >
        Back to Home
      </Link>
    </div>
  );
}
