"use client";

import { GenerationStep } from "@/lib/types";

const STEPS: { key: GenerationStep; label: string }[] = [
  { key: "fetching-roads", label: "Fetching roads..." },
  { key: "fetching-features", label: "Fetching features..." },
  { key: "rendering", label: "Rendering poster..." },
  { key: "exporting", label: "Exporting..." },
  { key: "done", label: "Done!" },
];

interface ProgressBarProps {
  step: GenerationStep;
  error?: string;
}

export default function ProgressBar({ step, error }: ProgressBarProps) {
  if (step === "idle") return null;

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const label =
    step === "error"
      ? error || "An error occurred"
      : step === "geocoding"
        ? "Looking up coordinates..."
        : STEPS.find((s) => s.key === step)?.label || "Processing...";

  return (
    <div className="progress-container">
      <div className="progress-steps">
        {STEPS.map((s, i) => {
          let cls = "progress-step";
          if (step === "error") {
            cls += i <= currentIdx ? " done" : "";
          } else if (i < currentIdx) {
            cls += " done";
          } else if (i === currentIdx) {
            cls += step === "done" ? " done" : " active";
          }
          return <div key={s.key} className={cls} />;
        })}
      </div>
      <div
        className="progress-label"
        style={step === "error" ? { color: "var(--danger)" } : undefined}
      >
        {label}
      </div>
    </div>
  );
}
