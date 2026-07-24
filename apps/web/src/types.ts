import type {
  IncidentStatus,
  OrganizationRole,
  Provider,
  RunStatus,
} from "@arc/contracts";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  role: OrganizationRole;
  membership_status: string;
  organizations: Organization;
}

export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  expected_sla_seconds: number | null;
  external_workflow_id: string;
  integration_source_id: string;
  metadata: Record<string, unknown>;
}

export interface WorkflowRun {
  id: string;
  organization_id: string;
  workflow_definition_id: string;
  integration_source_id: string;
  external_run_id: string;
  parent_run_id: string | null;
  status: RunStatus;
  trigger_type: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  attempt_number: number;
  summary: string | null;
  input_summary: Record<string, unknown>;
  output_summary: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  workflow_definitions?: Pick<Workflow, "id" | "name">;
}

export interface RunStep {
  id: string;
  workflow_run_id: string;
  sequence_number: number;
  name: string;
  step_type: string;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  error_code: string | null;
  error_message: string | null;
}

export interface Incident {
  id: string;
  organization_id: string;
  workflow_definition_id: string;
  workflow_run_id: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: IncidentStatus;
  title: string;
  summary: string;
  detection_source: string;
  detected_at: string;
  assigned_to: string | null;
  root_cause: string | null;
  resolution_summary: string | null;
  workflow_definitions?: Pick<Workflow, "id" | "name">;
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  actor_user_id: string | null;
  note: string | null;
  created_at: string;
}

export interface IntegrationSource {
  id: string;
  organization_id: string;
  environment_id: string;
  name: string;
  provider_type: Provider;
  status: string;
  webhook_key_prefix: string | null;
  last_event_at: string | null;
  public_configuration: Record<string, unknown>;
}

export interface ApprovalRequest {
  id: string;
  organization_id: string;
  workflow_run_id: string;
  title: string;
  description: string;
  status: string;
  assigned_to: string;
  due_at: string | null;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor_type: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}
