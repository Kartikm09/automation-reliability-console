import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlarmClock,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { Metric } from "../components/Metric";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { errorMessage } from "../lib/errors";
import { formatDuration, formatRelative } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Incident, Workflow, WorkflowRun } from "../types";

interface DashboardData {
  incidents: Incident[];
  runs: WorkflowRun[];
  workflows: Workflow[];
}

async function loadDashboard(organizationId: string): Promise<DashboardData> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [runs, incidents, workflows] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("*, workflow_definitions!inner(id, name)")
      .eq("organization_id", organizationId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("incidents")
      .select("*, workflow_definitions!inner(id, name)")
      .eq("organization_id", organizationId)
      .in("status", ["open", "acknowledged", "investigating"])
      .order("detected_at", { ascending: false })
      .limit(20),
    supabase
      .from("workflow_definitions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("enabled", true)
      .order("name"),
  ]);
  if (runs.error) throw runs.error;
  if (incidents.error) throw incidents.error;
  if (workflows.error) throw workflows.error;
  return {
    runs: (runs.data ?? []) as WorkflowRun[],
    incidents: (incidents.data ?? []) as Incident[],
    workflows: (workflows.data ?? []) as Workflow[],
  };
}

function dailyRunCounts(runs: WorkflowRun[]) {
  const formatter = new Intl.DateTimeFormat("en", { weekday: "short" });
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const inDay = runs.filter((run) => {
      const created = new Date(run.created_at);
      return created >= date && created < next;
    });
    return {
      label: formatter.format(date),
      total: inDay.length,
      failed: inDay.filter((run) =>
        ["failed", "timed_out"].includes(run.status),
      ).length,
    };
  });
}

export function DashboardPage() {
  const { organization } = useOrganization();
  const query = useQuery({
    queryKey: ["organization", organization?.id, "dashboard"],
    queryFn: () => loadDashboard(organization!.id),
    enabled: Boolean(organization),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.error) {
    return (
      <ErrorState
        message={errorMessage(query.error)}
        retry={() => void query.refetch()}
      />
    );
  }
  const data = query.data!;
  const last24Hours = data.runs.filter(
    (run) => new Date(run.created_at).getTime() > Date.now() - 86_400_000,
  );
  const successRate = last24Hours.length
    ? Math.round(
        (last24Hours.filter((run) => run.status === "succeeded").length /
          last24Hours.length) *
          100,
      )
    : 0;
  const measuredDurations = last24Hours
    .map((run) => run.duration_ms)
    .filter((value): value is number => value !== null);
  const averageDuration = measuredDurations.length
    ? measuredDurations.reduce((sum, value) => sum + value, 0) /
      measuredDurations.length
    : null;
  const trend = dailyRunCounts(data.runs);
  const maximum = Math.max(...trend.map((day) => day.total), 1);

  return (
    <>
      <PageHeader
        eyebrow={organization?.name}
        title="Operations overview"
        description="Authoritative workflow health from normalized execution events."
        actions={
          <Link className="button button--secondary" to="/runs">
            View all runs
            <ArrowUpRight aria-hidden="true" size={16} />
          </Link>
        }
      />

      <section className="metric-grid" aria-label="Operational summary">
        <Metric
          detail="Received during the last 24 hours"
          icon={<Activity aria-hidden="true" size={18} />}
          label="Workflow runs"
          value={String(last24Hours.length)}
        />
        <Metric
          detail="Terminal runs completed successfully"
          icon={<CheckCircle2 aria-hidden="true" size={18} />}
          label="Success rate"
          tone={
            successRate >= 95
              ? "positive"
              : successRate >= 80
                ? "warning"
                : "negative"
          }
          value={`${successRate}%`}
        />
        <Metric
          detail="Across completed runs in this period"
          icon={<AlarmClock aria-hidden="true" size={18} />}
          label="Average duration"
          value={formatDuration(averageDuration)}
        />
        <Metric
          detail="Open, acknowledged, or under investigation"
          icon={<ShieldAlert aria-hidden="true" size={18} />}
          label="Active incidents"
          tone={data.incidents.length ? "negative" : "positive"}
          value={String(data.incidents.length)}
        />
      </section>

      <section className="dashboard-grid">
        <div className="panel panel--wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Seven-day signal</p>
              <h2>Execution volume</h2>
            </div>
            <div className="legend">
              <span>
                <i className="legend__bar" /> Runs
              </span>
              <span>
                <i className="legend__bar legend__bar--failed" /> Failed
              </span>
            </div>
          </div>
          <div className="bar-chart" aria-label="Runs by day">
            {trend.map((day) => (
              <div className="bar-chart__column" key={day.label}>
                <div className="bar-chart__value">{day.total}</div>
                <div className="bar-chart__track">
                  <span
                    className="bar-chart__bar"
                    style={{
                      height: `${Math.max(8, (day.total / maximum) * 100)}%`,
                    }}
                  />
                  {day.failed ? (
                    <span
                      className="bar-chart__failed"
                      style={{
                        height: `${Math.max(
                          7,
                          (day.failed / Math.max(day.total, 1)) *
                            (day.total / maximum) *
                            100,
                        )}%`,
                      }}
                    />
                  ) : null}
                </div>
                <span>{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operator queue</p>
              <h2>Active incidents</h2>
            </div>
            <Link to="/incidents">Open queue</Link>
          </div>
          {data.incidents.length ? (
            <div className="incident-stack">
              {data.incidents.slice(0, 4).map((incident) => (
                <Link
                  className="incident-line"
                  key={incident.id}
                  to={`/incidents/${incident.id}`}
                >
                  <span
                    className={`severity-marker severity-marker--${incident.severity}`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{incident.title}</strong>
                    <small>{formatRelative(incident.detected_at)}</small>
                  </span>
                  <StatusBadge value={incident.status} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active incidents"
              description="Failed or timed-out runs will appear here automatically."
            />
          )}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Latest activity</p>
            <h2>Recent workflow runs</h2>
          </div>
          <span className="section-heading__meta">
            {data.workflows.length} active workflows
          </span>
        </div>
        {data.runs.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Trigger</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.runs.slice(0, 8).map((run) => (
                  <tr key={run.id}>
                    <td>
                      <strong>
                        {run.workflow_definitions?.name ?? "Workflow"}
                      </strong>
                      <small>{run.external_run_id}</small>
                    </td>
                    <td>
                      <StatusBadge value={run.status} />
                    </td>
                    <td>{run.trigger_type}</td>
                    <td>{formatDuration(run.duration_ms)}</td>
                    <td>{formatRelative(run.started_at)}</td>
                    <td>
                      <Link
                        className="row-action"
                        to={`/runs/${run.id}`}
                        aria-label={`Open run ${run.external_run_id}`}
                      >
                        <ArrowUpRight aria-hidden="true" size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No execution events yet"
            description="Configure an integration source and send a signed sample event."
          />
        )}
      </section>
    </>
  );
}
