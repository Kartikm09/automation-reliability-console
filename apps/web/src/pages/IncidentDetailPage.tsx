import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  Clock3,
  SearchCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { formatDateTime, formatRelative, titleCase } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { Incident, IncidentEvent } from "../types";

interface IncidentDetailData {
  events: IncidentEvent[];
  incident: Incident;
}

async function loadIncidentDetail(
  organizationId: string,
  incidentId: string,
): Promise<IncidentDetailData> {
  const [incident, events] = await Promise.all([
    supabase
      .from("incidents")
      .select("*, workflow_definitions!inner(id, name)")
      .eq("organization_id", organizationId)
      .eq("id", incidentId)
      .maybeSingle(),
    supabase
      .from("incident_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("incident_id", incidentId)
      .order("created_at"),
  ]);
  if (incident.error) throw incident.error;
  if (!incident.data) throw new Error("Incident not found or access denied.");
  if (events.error) throw events.error;
  return {
    incident: incident.data as Incident,
    events: (events.data ?? []) as IncidentEvent[],
  };
}

const transitions: Record<
  string,
  Array<{ label: string; status: string; icon: typeof CircleDot }>
> = {
  open: [
    { label: "Acknowledge", status: "acknowledged", icon: CircleDot },
    {
      label: "Start investigation",
      status: "investigating",
      icon: SearchCheck,
    },
  ],
  acknowledged: [
    {
      label: "Start investigation",
      status: "investigating",
      icon: SearchCheck,
    },
    { label: "Resolve", status: "resolved", icon: CheckCircle2 },
  ],
  investigating: [{ label: "Resolve", status: "resolved", icon: CheckCircle2 }],
  resolved: [{ label: "Close", status: "closed", icon: CheckCircle2 }],
};

export function IncidentDetailPage() {
  const { incidentId = "" } = useParams();
  const { organization, membership } = useOrganization();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "incident", incidentId],
    queryFn: () => loadIncidentDetail(organization!.id, incidentId),
    enabled: Boolean(organization && incidentId),
  });
  const transitionMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data, error } = await supabase.rpc("transition_incident", {
        target_incident_id: incidentId,
        target_status: status,
        transition_note: note.trim() || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      notify("Incident state updated and audited.");
      setPendingStatus(null);
      setNote("");
      void queryClient.invalidateQueries({
        queryKey: ["organization", organization?.id],
      });
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={errorMessage(query.error)} />;
  const { incident, events } = query.data!;
  const allowedTransitions = transitions[incident.status] ?? [];
  const canMutate =
    membership && ["owner", "admin", "operator"].includes(membership.role);

  return (
    <>
      <Link className="back-link" to="/incidents">
        <ArrowLeft aria-hidden="true" size={16} />
        Incidents
      </Link>
      <PageHeader
        eyebrow={`${titleCase(incident.severity)} severity`}
        title={incident.title}
        description={incident.summary}
        actions={<StatusBadge value={incident.status} />}
      />

      <section className="incident-facts">
        <div>
          <span>Detected</span>
          <strong>{formatDateTime(incident.detected_at)}</strong>
        </div>
        <div>
          <span>Workflow</span>
          <strong>{incident.workflow_definitions?.name}</strong>
        </div>
        <div>
          <span>Detection source</span>
          <strong>{titleCase(incident.detection_source)}</strong>
        </div>
        <div>
          <span>Run</span>
          <strong>
            {incident.workflow_run_id?.slice(0, 8) ?? "No linked run"}
          </strong>
        </div>
      </section>

      {canMutate && allowedTransitions.length ? (
        <section className="action-band">
          <div>
            <p className="eyebrow">Authorized transition</p>
            <h2>Move the response forward</h2>
          </div>
          <div className="action-band__actions">
            {allowedTransitions.map(({ icon: Icon, label, status }) => (
              <Button
                key={status}
                tone="secondary"
                onClick={() => setPendingStatus(status)}
              >
                <Icon aria-hidden="true" size={16} />
                {label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="detail-grid">
        <div className="panel panel--wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Append-only history</p>
              <h2>Incident timeline</h2>
            </div>
            <Clock3 aria-hidden="true" size={18} />
          </div>
          <div className="timeline">
            <div className="timeline__item timeline__item--static">
              <span className="timeline__marker" />
              <span>
                <strong>Incident detected</strong>
                <small>{formatRelative(incident.detected_at)}</small>
                <p>{incident.summary}</p>
              </span>
            </div>
            {events.map((event) => (
              <div
                className="timeline__item timeline__item--static"
                key={event.id}
              >
                <span className="timeline__marker" />
                <span>
                  <strong>{titleCase(event.event_type)}</strong>
                  <small>{formatRelative(event.created_at)}</small>
                  {event.note ? <p>{event.note}</p> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
        <aside className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Resolution</p>
              <h2>Investigation notes</h2>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Assigned to</dt>
              <dd>{incident.assigned_to?.slice(0, 8) ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt>Root cause</dt>
              <dd>{incident.root_cause ?? "Not recorded"}</dd>
            </div>
            <div>
              <dt>Resolution</dt>
              <dd>{incident.resolution_summary ?? "Not recorded"}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <dialog className="dialog" open={pendingStatus !== null}>
        <h2>{pendingStatus ? titleCase(pendingStatus) : "Update incident"}</h2>
        <p>
          Add a concise operational note. The transition and note become part of
          the audit trail.
        </p>
        <label>
          Operational note
          <textarea
            rows={4}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="dialog__actions">
          <Button tone="quiet" onClick={() => setPendingStatus(null)}>
            Cancel
          </Button>
          <Button
            loading={transitionMutation.isPending}
            onClick={() =>
              pendingStatus && transitionMutation.mutate(pendingStatus)
            }
          >
            Confirm transition
          </Button>
        </div>
      </dialog>
    </>
  );
}
