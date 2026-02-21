import QueryClient from "@/components/query-client";
import RequireAuth from "@/src/components/RequireAuth";

export default function QueryPage() {
  return (
    <RequireAuth title="Sign in to get started" description="Connect your data and start getting real-time business insights.">
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">Ask Your Data</h1>
        <p className="text-sm text-gray-300">
          Ask any business question in plain English — get instant insights, trends, and projections from your connected data.
        </p>
        <QueryClient canRun={true} />
      </div>
    </RequireAuth>
  );
}
