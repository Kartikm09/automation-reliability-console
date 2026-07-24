import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { errorMessage } from "../lib/errors";
import { formatDuration, formatRelative } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { WorkflowRun } from "../types";

async function loadRuns(
  organizationId: string,
  workflowId: string | null,
): Promise<WorkflowRun[]> {
  let query = supabase
    .from("workflow_runs")
    .select("*, workflow_definitions!inner(id, name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(250);
  if (workflowId) query = query.eq("workflow_definition_id", workflowId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WorkflowRun[];
}

export function RunsPage() {
  const { organization } = useOrganization();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("workflow");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "runs", workflowId],
    queryFn: () => loadRuns(organization!.id, workflowId),
    enabled: Boolean(organization),
  });
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((run) => {
        const text =
          `${run.external_run_id} ${run.summary ?? ""} ${run.workflow_definitions?.name ?? ""}`.toLowerCase();
        return (
          (!search || text.includes(search.toLowerCase())) &&
          (status === "all" || run.status === status) &&
          (trigger === "all" || run.trigger_type === trigger)
        );
      }),
    [query.data, search, status, trigger],
  );

  if (query.isLoading) return <LoadingState />;
  if (query.error) {
    return (
      <ErrorState
        message={errorMessage(query.error)}
        retry={() => void query.refetch()}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Canonical execution history"
        title="Workflow runs"
        description="Provider-neutral status, timing, safe summaries, and replay relationships."
      />
      <div className="toolbar toolbar--wrap">
        <label className="search-field">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search runs</span>
          <input
            placeholder="Search run ID or workflow"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="filter-field">
          <Filter aria-hidden="true" size={16} />
          <span className="sr-only">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="timed_out">Timed out</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="filter-field">
          <span className="sr-only">Trigger</span>
          <select
            value={trigger}
            onChange={(event) => setTrigger(event.target.value)}
          >
            <option value="all">All triggers</option>
            <option value="webhook">Webhook</option>
            <option value="schedule">Schedule</option>
            <option value="replay">Replay</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <span className="toolbar__count">{filtered.length} runs</span>
      </div>

      {filtered.length ? (
        <section className="panel panel--flush">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Attempt</th>
                  <th>Duration</th>
                  <th>Started</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((run) => (
                  <tr key={run.id}>
                    <td>
                      <strong>{run.external_run_id}</strong>
                      <small>{run.trigger_type}</small>
                    </td>
                    <td>{run.workflow_definitions?.name ?? "Workflow"}</td>
                    <td>
                      <StatusBadge value={run.status} />
                    </td>
                    <td>{run.attempt_number}</td>
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
        </section>
      ) : (
        <EmptyState
          title="No matching runs"
          description="Change the filters or ingest a signed execution event."
        />
      )}
    </>
  );
}
