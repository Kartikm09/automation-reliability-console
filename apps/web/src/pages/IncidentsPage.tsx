import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { errorMessage } from "../lib/errors";
import { formatRelative, titleCase } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Incident } from "../types";

async function loadIncidents(organizationId: string): Promise<Incident[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*, workflow_definitions!inner(id, name)")
    .eq("organization_id", organizationId)
    .order("detected_at", { ascending: false })
    .limit(250);
  if (error) throw error;
  return (data ?? []) as Incident[];
}

export function IncidentsPage() {
  const { organization } = useOrganization();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [severity, setSeverity] = useState("all");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "incidents"],
    queryFn: () => loadIncidents(organization!.id),
    enabled: Boolean(organization),
  });
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter((incident) => {
        const matchesSearch =
          !search ||
          `${incident.title} ${incident.summary} ${incident.workflow_definitions?.name ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase());
        const matchesStatus =
          status === "all" ||
          (status === "active" &&
            ["open", "acknowledged", "investigating"].includes(
              incident.status,
            )) ||
          incident.status === status;
        return (
          matchesSearch &&
          matchesStatus &&
          (severity === "all" || incident.severity === severity)
        );
      }),
    [query.data, search, severity, status],
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
        eyebrow="Operator response"
        title="Incidents"
        description="Failure signals, investigation state, assignment, and resolution history."
      />
      <div className="toolbar toolbar--wrap">
        <label className="search-field">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search incidents</span>
          <input
            placeholder="Search incidents"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Incident status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="active">Active incidents</option>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Incident severity</span>
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <span className="toolbar__count">{filtered.length} incidents</span>
      </div>

      {filtered.length ? (
        <section className="incident-list">
          {filtered.map((incident) => (
            <article className="incident-row" key={incident.id}>
              <span
                className={`severity-icon severity-icon--${incident.severity}`}
              >
                <ShieldAlert aria-hidden="true" size={18} />
              </span>
              <div className="incident-row__copy">
                <div>
                  <strong>{incident.title}</strong>
                  <span>
                    {incident.workflow_definitions?.name ?? "Workflow"}
                  </span>
                </div>
                <p>{incident.summary}</p>
              </div>
              <div className="incident-row__severity">
                <span>{titleCase(incident.severity)}</span>
                <small>{formatRelative(incident.detected_at)}</small>
              </div>
              <StatusBadge value={incident.status} />
              <Link
                className="row-action"
                to={`/incidents/${incident.id}`}
                aria-label={`Open incident ${incident.title}`}
              >
                <ArrowUpRight aria-hidden="true" size={16} />
              </Link>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No incidents match"
          description="Change the filters or wait for a qualifying workflow signal."
        />
      )}
    </>
  );
}
