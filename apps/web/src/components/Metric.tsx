import type { ReactNode } from "react";

export function Metric({
  detail,
  icon,
  label,
  tone = "neutral",
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone?: "positive" | "negative" | "warning" | "neutral";
  value: string;
}) {
  return (
    <article className={`metric metric--${tone}`}>
      <div className="metric__label">
        <span className="metric__icon">{icon}</span>
        {label}
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}
