import QueryClient from "@/components/query-client";
import RequireAuth from "@/src/components/RequireAuth";

export default function QueryPage() {
  return (
    <RequireAuth title="Sign in to query data" description="Generate and run SQL securely with Data Vista.">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Query Data Vista</h1>
        <p className="text-sm text-gray-300">
          Use a connected data source to generate and run SQL with Data Vista.
        </p>
        <QueryClient canRun={true} />
      </div>
    </RequireAuth>
  );
}
