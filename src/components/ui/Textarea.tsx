import React from "react";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string;
  helperText?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ className = "", error, helperText, ...props }, ref) => {
    return (
      <div>
        <textarea
          ref={ref}
          className={`w-full rounded-xl border px-4 py-3 bg-white/[0.03] text-grape-100 border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white/[0.1] focus:border-white/[0.15] backdrop-blur-md placeholder:text-grape-500 ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-grape-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

export default Textarea;
