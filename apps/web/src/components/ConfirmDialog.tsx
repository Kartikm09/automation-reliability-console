import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "./Button";

export function ConfirmDialog({
  confirmLabel,
  description,
  loading = false,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  confirmLabel: string;
  description: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby={titleId}
      className="dialog"
      ref={dialogRef}
      onCancel={onCancel}
    >
      <button
        className="icon-button dialog__close"
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
      >
        <X aria-hidden="true" size={18} />
      </button>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      <div className="dialog__actions">
        <Button tone="quiet" onClick={onCancel}>
          Cancel
        </Button>
        <Button loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
