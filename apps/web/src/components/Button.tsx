import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  tone?: "primary" | "secondary" | "danger" | "quiet";
}

export function Button({
  children,
  className = "",
  disabled,
  loading = false,
  tone = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      className={`button button--${tone} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="spin" aria-hidden="true" size={16} />
      ) : null}
      {children}
    </button>
  );
}
