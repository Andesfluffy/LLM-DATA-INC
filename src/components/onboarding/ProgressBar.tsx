"use client";

type ProgressBarProps = {
  steps: string[];
  currentStep: number;
};

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="mx-auto flex min-w-max items-center justify-center gap-2 px-1" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  i < currentStep
                    ? "bg-emerald-400"
                    : i === currentStep
                    ? "bg-accent ring-2 ring-accent/30 ring-offset-1 ring-offset-[#0a101e]"
                    : "bg-slate-700"
                }`}
              />
              <span className={`hidden text-[10px] font-medium sm:inline ${i === currentStep ? "text-accent" : i < currentStep ? "text-emerald-400" : "text-slate-600"}`}>
                {label}
              </span>
              <span className={`text-[10px] font-medium sm:hidden ${i === currentStep ? "text-accent" : i < currentStep ? "text-emerald-400" : "text-slate-600"}`}>
                {i + 1}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 sm:w-12 mb-4 ${i < currentStep ? "bg-emerald-400/50" : "bg-slate-700/50"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
