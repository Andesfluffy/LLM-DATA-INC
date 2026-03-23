import React from "react";
import Table from "@/src/components/Table";

function ResultsTable({ fields, rows }: { fields: string[]; rows: Record<string, any>[] }) {
  return <Table fields={fields} rows={rows} pageSize={100} />;
}

export default React.memo(ResultsTable);
