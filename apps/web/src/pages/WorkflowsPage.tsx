import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Clock3,
  Search,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { errorMessage } from "../lib/errors";
import { formatDuration } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Workflow } from "../types";

interface WorkflowWithRuns extends Workflow {
  workflow_runs: Array<{
    duration_ms: number | null;
    started_at: string | null;
    status: string;
  }>;
}

async function loadWorkflows(
  organizationId: string,
): Promise<WorkflowWithRuns[]> {
  const { data, error } = await supabase
    .from("workflow_definitions")
    .select("*, workflow_runs(status, started_at, duration_ms)")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as WorkflowWithRuns[];
}

export function WorkflowsPage() {
  const { organization } = useOrganization();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "workflows"],
    queryFn: () => loadWorkflows(organization!.id),
    enabled: Boolean(organization),
  });
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((workflow) => {
        const matchesSearch =
          !search ||
          `${workflow.name} ${workflow.description ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const recent = [...workflow.workflow_runs].sort((left, right) =>
          String(right.started_at).localeCompare(String(left.started_at)),
        )[0];
        const matchesStatus = status === "all" || recent?.status === status;
        return matchesSearch && matchesStatus;
      }),
    [query.data, search, status],
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
        eyebrow="Execution catalogue"
        title="Workflows"
        description="Provider-backed definitions, expected duration, and recent health."
      />
      <div className="toolbar">
        <label className="search-field">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search workflows</span>
          <input
            placeholder="Search workflows"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter by latest status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All latest states</option>
            <option value="succeeded">Succeeded</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="timed_out">Timed out</option>
          </select>
        </label>
        <span className="toolbar__count">{filtered.length} workflows</span>
      </div>

      {filtered.length ? (
        <section className="workflow-grid">
          {filtered.map((workflow) => {
            const runs = [...workflow.workflow_runs].sort((left, right) =>
              String(right.started_at).localeCompare(String(left.started_at)),
            );
            const latest = runs[0];
            const recent = runs.slice(0, 10);
            const successful = recent.filter(
              (run) => run.status === "succeeded",
            ).length;
            const durations = recent
              .map((run) => run.duration_ms)
              .filter((value): value is number => value !== null);
            const average = durations.length
              ? durations.reduce((sum, value) => sum + value, 0) /
                durations.length
              : null;
            return (
              <article className="workflow-card" key={workflow.id}>
                <header>
                  <span className="provider-icon">
                    <WorkflowIcon aria-hidden="true" size={19} />
                  </span>
                  <StatusBadge value={latest?.status ?? "no_runs"} />
                </header>
                <h2>{workflow.name}</h2>
                <p>
                  {workflow.description ?? "No workflow description recorded."}
                </p>
                <dl>
                  <div>
                    <dt>Recent success</dt>
                    <dd>
                      {recent.length
                        ? `${Math.round((successful / recent.length) * 100)}%`
                        : "No data"}
                    </dd>
                  </div>
                  <div>
                    <dt>Average duration</dt>
                    <dd>{formatDuration(average)}</dd>
                  </div>
                  <div>
                    <dt>Expected SLA</dt>
                    <dd>
                      <Clock3 aria-hidden="true" size={14} />
                      {workflow.expected_sla_seconds
                        ? formatDuration(workflow.expected_sla_seconds * 1000)
                        : "Not set"}
                    </dd>
                  </div>
                </dl>
                <Link to={`/workflows/${workflow.id}`}>
                  Inspect workflow
                  <ArrowUpRight aria-hidden="true" size={16} />
                </Link>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState
          title="No workflows match"
          description="Adjust the search or status filter, or ingest the first signed event."
        />
      )}
    </>
  );
}
