import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, Clock3, Gauge, History } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Metric } from "../components/Metric";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { errorMessage } from "../lib/errors";
import { formatDuration, formatRelative } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Incident, Workflow, WorkflowRun } from "../types";

interface WorkflowDetailData {
  incidents: Incident[];
  runs: WorkflowRun[];
  workflow: Workflow;
}

async function loadWorkflowDetail(
  organizationId: string,
  workflowId: string,
): Promise<WorkflowDetailData> {
  const [workflow, runs, incidents] = await Promise.all([
    supabase
      .from("workflow_definitions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", workflowId)
      .maybeSingle(),
    supabase
      .from("workflow_runs")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workflow_definition_id", workflowId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workflow_definition_id", workflowId)
      .order("detected_at", { ascending: false })
      .limit(10),
  ]);
  if (workflow.error) throw workflow.error;
  if (!workflow.data) throw new Error("Workflow not found or access denied.");
  if (runs.error) throw runs.error;
  if (incidents.error) throw incidents.error;
  return {
    workflow: workflow.data as Workflow,
    runs: (runs.data ?? []) as WorkflowRun[],
    incidents: (incidents.data ?? []) as Incident[],
  };
}

export function WorkflowDetailPage() {
  const { workflowId = "" } = useParams();
  const { organization } = useOrganization();
  const query = useQuery({
    queryKey: ["organization", organization?.id, "workflow", workflowId],
    queryFn: () => loadWorkflowDetail(organization!.id, workflowId),
    enabled: Boolean(organization && workflowId),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={errorMessage(query.error)} />;

  const { workflow, runs, incidents } = query.data!;
  const successful = runs.filter((run) => run.status === "succeeded").length;
  const durations = runs
    .map((run) => run.duration_ms)
    .filter((value): value is number => value !== null);
  const average = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null;
  const activeIncidents = incidents.filter((incident) =>
    ["open", "acknowledged", "investigating"].includes(incident.status),
  );

  return (
    <>
      <Link className="back-link" to="/workflows">
        <ArrowLeft aria-hidden="true" size={16} />
        Workflows
      </Link>
      <PageHeader
        eyebrow={workflow.external_workflow_id}
        title={workflow.name}
        description={workflow.description ?? "No description recorded."}
        actions={
          <StatusBadge value={workflow.enabled ? "active" : "disabled"} />
        }
      />
      <section className="metric-grid metric-grid--three">
        <Metric
          detail={`Across ${runs.length} recent runs`}
          icon={<Gauge aria-hidden="true" size={18} />}
          label="Success rate"
          tone={
            runs.length && successful / runs.length >= 0.95
              ? "positive"
              : "warning"
          }
          value={
            runs.length
              ? `${Math.round((successful / runs.length) * 100)}%`
              : "No data"
          }
        />
        <Metric
          detail={
            workflow.expected_sla_seconds
              ? `Expected ${formatDuration(workflow.expected_sla_seconds * 1000)}`
              : "No expected SLA configured"
          }
          icon={<Clock3 aria-hidden="true" size={18} />}
          label="Average duration"
          value={formatDuration(average)}
        />
        <Metric
          detail="Currently open or under investigation"
          icon={<Activity aria-hidden="true" size={18} />}
          label="Active incidents"
          tone={activeIncidents.length ? "negative" : "positive"}
          value={String(activeIncidents.length)}
        />
      </section>

      <section className="detail-grid">
        <div className="panel panel--wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Execution history</p>
              <h2>Recent runs</h2>
            </div>
            <Link to={`/runs?workflow=${workflow.id}`}>All runs</Link>
          </div>
          {runs.length ? (
            <div className="timeline timeline--compact">
              {runs.slice(0, 12).map((run) => (
                <Link
                  className="timeline__item"
                  key={run.id}
                  to={`/runs/${run.id}`}
                >
                  <span
                    className={`timeline__marker timeline__marker--${run.status}`}
                  />
                  <span>
                    <strong>{run.summary ?? run.external_run_id}</strong>
                    <small>
                      {formatRelative(run.started_at)} ·{" "}
                      {formatDuration(run.duration_ms)}
                    </small>
                  </span>
                  <StatusBadge value={run.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No runs"
              description="This workflow has not received a normalized execution event."
            />
          )}
        </div>
        <aside className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Configuration</p>
              <h2>Operating contract</h2>
            </div>
            <History aria-hidden="true" size={18} />
          </div>
          <dl className="definition-list">
            <div>
              <dt>Expected SLA</dt>
              <dd>
                {workflow.expected_sla_seconds
                  ? `${workflow.expected_sla_seconds} seconds`
                  : "Not set"}
              </dd>
            </div>
            <div>
              <dt>Failure threshold</dt>
              <dd>
                {String(
                  workflow.metadata.failure_threshold ?? "Defined by source",
                )}
              </dd>
            </div>
            <div>
              <dt>Integration source</dt>
              <dd>{workflow.integration_source_id.slice(0, 8)}</dd>
            </div>
            <div>
              <dt>Enabled</dt>
              <dd>{workflow.enabled ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </aside>
      </section>
    </>
  );
}
