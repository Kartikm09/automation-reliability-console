import { useQuery } from "@tanstack/react-query";
import { FileClock, Filter } from "lucide-react";
import { useMemo, useState } from "react";

import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { useOrganization } from "../context/OrganizationContext";
import { errorMessage } from "../lib/errors";
import { formatDateTime, titleCase } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { AuditEvent } from "../types";

async function loadAuditEvents(organizationId: string): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select(
      "id, organization_id, actor_user_id, actor_type, action, resource_type, resource_id, created_at, metadata",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) throw error;
  return (data ?? []) as AuditEvent[];
}

export function AuditPage() {
  const { organization } = useOrganization();
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("all");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "audit"],
    queryFn: () => loadAuditEvents(organization!.id),
    enabled: Boolean(organization),
  });

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (event) =>
        (resourceType === "all" || event.resource_type === resourceType) &&
        (!normalized ||
          event.action.toLowerCase().includes(normalized) ||
          event.resource_type.toLowerCase().includes(normalized) ||
          event.resource_id?.toLowerCase().includes(normalized)),
    );
  }, [query.data, resourceType, search]);
  const resourceTypes = Array.from(
    new Set((query.data ?? []).map((event) => event.resource_type)),
  ).sort();

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
        eyebrow="Append-only evidence"
        title="Audit history"
        description="Sensitive actions, state transitions, and system processing in one tenant-safe timeline."
      />
      <section className="filter-bar" aria-label="Audit filters">
        <label className="search-control">
          <span className="sr-only">Search audit events</span>
          <Filter aria-hidden="true" size={16} />
          <input
            placeholder="Search action or resource"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Resource type</span>
          <select
            value={resourceType}
            onChange={(event) => setResourceType(event.target.value)}
          >
            <option value="all">All resource types</option>
            {resourceTypes.map((resource) => (
              <option key={resource} value={resource}>
                {titleCase(resource)}
              </option>
            ))}
          </select>
        </label>
        <span className="filter-bar__count">{filtered.length} events</span>
      </section>

      {filtered.length ? (
        <section className="panel audit-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr key={event.id}>
                    <td className="nowrap">
                      {formatDateTime(event.created_at)}
                    </td>
                    <td>
                      <span className="actor-cell">
                        <FileClock aria-hidden="true" size={15} />
                        {event.actor_type === "system"
                          ? "System"
                          : (event.actor_user_id?.slice(0, 8) ?? "Platform")}
                      </span>
                    </td>
                    <td>
                      <strong>{titleCase(event.action)}</strong>
                    </td>
                    <td>
                      {titleCase(event.resource_type)}
                      <small className="table-subline">
                        {event.resource_id?.slice(0, 8) ?? "No record ID"}
                      </small>
                    </td>
                    <td>
                      <code className="metadata-summary">
                        {Object.keys(event.metadata ?? {}).length
                          ? JSON.stringify(event.metadata)
                          : "Recorded"}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState
          title="No matching audit events"
          description="Try a broader filter. Audit records appear automatically when protected operations run."
        />
      )}
    </>
  );
}
