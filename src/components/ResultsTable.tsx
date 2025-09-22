import React from "react";
import Table from "@/src/components/Table";

function ResultsTable({ fields, rows }: { fields: string[]; rows: Record<string, any>[] }) {
  return <Table fields={fields} rows={rows} />;
}

export default React.memo(ResultsTable);

