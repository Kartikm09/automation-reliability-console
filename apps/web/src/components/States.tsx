import { CircleAlert, Inbox, RefreshCw } from "lucide-react";

import { Button } from "./Button";

export function LoadingState({
  label = "Loading operational data",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__bar" />
      <span className="loading-state__bar" />
      <span className="loading-state__bar" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({
  description,
  title = "Nothing to show",
}: {
  description: string;
  title?: string;
}) {
  return (
    <div className="empty-state">
      <Inbox aria-hidden="true" size={24} />
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <CircleAlert aria-hidden="true" size={24} />
      <div>
        <h2>Operational data unavailable</h2>
        <p>{message}</p>
      </div>
      {retry ? (
        <Button tone="secondary" onClick={retry}>
          <RefreshCw aria-hidden="true" size={16} />
          Retry
        </Button>
      ) : null}
    </div>
  );
}
