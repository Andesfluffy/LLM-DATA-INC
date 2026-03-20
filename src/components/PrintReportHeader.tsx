"use client";

type PrintReportHeaderProps = {
  lastQuestion: string;
};

export default function PrintReportHeader({ lastQuestion }: PrintReportHeaderProps) {
  return (
    <div className="print-report-header hidden">
      <h1>Data Insights Report</h1>
      <p>
        Generated on{" "}
        {new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      {lastQuestion && (
        <p style={{ marginTop: 6, fontWeight: 600, color: "#111827" }}>
          Question: {lastQuestion}
        </p>
      )}
    </div>
  );
}
