import QueryClient from "@/components/query-client";

export default function QueryPage() {
  return (
    <div className="space-y-4">
  <h1 className="text-xl font-semibold text-white">Query Data Vista</h1>
  <p className="text-sm text-gray-300">Use a saved data source to generate and run SQL with Data Vista.</p>
      <QueryClient canRun={true} />
    </div>
  );
}
