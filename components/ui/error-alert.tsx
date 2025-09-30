import type { HTMLAttributes } from "react";

type ErrorAlertProps = {
  message: string;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export default function ErrorAlert({ message, className = "", ...props }: ErrorAlertProps) {
  return (
    <div
      className={`flex items-start gap-2 rounded-md border border-red-500/30 bg-red-900/30 p-3 text-sm text-red-200 ${className}`}
      role="alert"
      {...props}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="mt-0.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <div className="flex-1">{message}</div>
    </div>
  );
}
