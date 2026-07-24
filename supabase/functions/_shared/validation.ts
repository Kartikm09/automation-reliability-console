import { InputError } from "./http.ts";

export function requiredString(
  value: unknown,
  field: string,
  maximum = 1000,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InputError("invalid_input", `${field} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new InputError("invalid_input", `${field} is too long.`);
  }
  return normalized;
}

export function requiredUuid(value: unknown, field: string): string {
  const normalized = requiredString(value, field, 36);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(
        normalized,
      )
  ) {
    throw new InputError("invalid_input", `${field} must be a UUID.`);
  }
  return normalized;
}

export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError(
      "invalid_input",
      "Request body must be a JSON object.",
    );
  }
  return value as Record<string, unknown>;
}
