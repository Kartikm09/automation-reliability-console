import { titleCase } from "../lib/format";

const positive = new Set(["active", "approved", "succeeded", "resolved"]);
const negative = new Set(["critical", "failed", "rejected", "timed_out"]);
const warning = new Set([
  "acknowledged",
  "high",
  "investigating",
  "medium",
  "pending",
  "processing",
  "running",
]);

export function statusTone(
  value: string,
): "positive" | "negative" | "warning" | "neutral" {
  if (positive.has(value)) return "positive";
  if (negative.has(value)) return "negative";
  if (warning.has(value)) return "warning";
  return "neutral";
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`status status--${statusTone(value)}`}>
      <span className="status__dot" aria-hidden="true" />
      {titleCase(value)}
    </span>
  );
}
