import { z } from "zod";

export type { Database, Json } from "./database.types.js";

export const providerSchema = z.enum(["custom", "n8n", "make", "zapier"]);
export const runStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "timed_out",
]);
export const incidentStatusSchema = z.enum([
  "open",
  "acknowledged",
  "investigating",
  "resolved",
  "closed",
]);
export const organizationRoleSchema = z.enum([
  "owner",
  "admin",
  "operator",
  "viewer",
]);

export const replayRequestSchema = z.object({
  workflow_run_id: z.uuid(),
  reason: z.string().trim().min(8).max(1000),
  idempotency_key: z.uuid().optional(),
});

export const integrationSourceSchema = z.object({
  environment_id: z.uuid(),
  name: z.string().trim().min(2).max(120),
  provider_type: providerSchema,
});

export type IncidentStatus = z.infer<typeof incidentStatusSchema>;
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;
export type Provider = z.infer<typeof providerSchema>;
export type RunStatus = z.infer<typeof runStatusSchema>;
