import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { formatRelative } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { ApprovalRequest } from "../types";

interface ReplayApproval {
  id: string;
  original_workflow_run_id: string;
  reason: string;
  status: string;
  requested_at: string;
  requested_by: string;
}

interface ApprovalData {
  approvals: ApprovalRequest[];
  replays: ReplayApproval[];
}

async function loadApprovals(organizationId: string): Promise<ApprovalData> {
  const [approvals, replays] = await Promise.all([
    supabase
      .from("approval_requests")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("replay_requests")
      .select(
        "id, original_workflow_run_id, reason, status, requested_at, requested_by",
      )
      .eq("organization_id", organizationId)
      .order("requested_at", { ascending: false }),
  ]);
  if (approvals.error) throw approvals.error;
  if (replays.error) throw replays.error;
  return {
    approvals: (approvals.data ?? []) as ApprovalRequest[],
    replays: (replays.data ?? []) as ReplayApproval[],
  };
}

export function ApprovalsPage() {
  const { organization, membership } = useOrganization();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"workflow" | "replay">("workflow");
  const [selected, setSelected] = useState<{
    id: string;
    kind: "workflow" | "replay";
    decision: "approved" | "rejected";
  } | null>(null);
  const [note, setNote] = useState("");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "approvals"],
    queryFn: () => loadApprovals(organization!.id),
    enabled: Boolean(organization),
  });
  const decisionMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      if (selected.kind === "workflow") {
        const { error } = await supabase.functions.invoke("decide-approval", {
          body: {
            approval_id: selected.id,
            decision: selected.decision,
            note,
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc("decide_replay_request", {
          target_replay_request_id: selected.id,
          decision: selected.decision,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      notify("Decision recorded in the audit history.");
      setSelected(null);
      setNote("");
      void queryClient.invalidateQueries({
        queryKey: ["organization", organization?.id],
      });
    },
    onError: (error) => notify(errorMessage(error), "error"),
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
  const pendingApprovals = query.data!.approvals.filter(
    (approval) => approval.status === "pending",
  );
  const pendingReplays = query.data!.replays.filter(
    (replay) => replay.status === "pending",
  );
  const canApproveReplay =
    membership && ["owner", "admin"].includes(membership.role);

  return (
    <>
      <PageHeader
        eyebrow="Human control"
        title="Approvals"
        description="Assigned workflow decisions and controlled replay authorization."
      />
      <div
        className="segmented-control"
        role="tablist"
        aria-label="Approval type"
      >
        <button
          className={view === "workflow" ? "is-selected" : ""}
          role="tab"
          aria-selected={view === "workflow"}
          onClick={() => setView("workflow")}
          type="button"
        >
          Workflow approvals
          <span>{pendingApprovals.length}</span>
        </button>
        <button
          className={view === "replay" ? "is-selected" : ""}
          role="tab"
          aria-selected={view === "replay"}
          onClick={() => setView("replay")}
          type="button"
        >
          Replay requests
          <span>{pendingReplays.length}</span>
        </button>
      </div>

      {view === "workflow" ? (
        pendingApprovals.length ? (
          <section className="approval-list">
            {pendingApprovals.map((approval) => (
              <article className="approval-row" key={approval.id}>
                <span className="approval-row__icon">
                  <Clock3 aria-hidden="true" size={19} />
                </span>
                <div>
                  <strong>{approval.title}</strong>
                  <p>{approval.description}</p>
                  <small>
                    Due{" "}
                    {approval.due_at
                      ? formatRelative(approval.due_at)
                      : "without a deadline"}
                  </small>
                </div>
                <StatusBadge value={approval.status} />
                <div className="approval-row__actions">
                  <Button
                    tone="secondary"
                    onClick={() =>
                      setSelected({
                        id: approval.id,
                        kind: "workflow",
                        decision: "rejected",
                      })
                    }
                  >
                    <X aria-hidden="true" size={16} />
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      setSelected({
                        id: approval.id,
                        kind: "workflow",
                        decision: "approved",
                      })
                    }
                  >
                    <Check aria-hidden="true" size={16} />
                    Approve
                  </Button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            title="No assigned approvals"
            description="Pending human-in-the-loop workflow decisions will appear here."
          />
        )
      ) : pendingReplays.length ? (
        <section className="approval-list">
          {pendingReplays.map((replay) => (
            <article className="approval-row" key={replay.id}>
              <span className="approval-row__icon">
                <RotateCcw aria-hidden="true" size={19} />
              </span>
              <div>
                <strong>
                  Replay {replay.original_workflow_run_id.slice(0, 8)}
                </strong>
                <p>{replay.reason}</p>
                <small>Requested {formatRelative(replay.requested_at)}</small>
              </div>
              <StatusBadge value={replay.status} />
              {canApproveReplay ? (
                <div className="approval-row__actions">
                  <Button
                    tone="secondary"
                    onClick={() =>
                      setSelected({
                        id: replay.id,
                        kind: "replay",
                        decision: "rejected",
                      })
                    }
                  >
                    <X aria-hidden="true" size={16} />
                    Reject
                  </Button>
                  <Button
                    onClick={() =>
                      setSelected({
                        id: replay.id,
                        kind: "replay",
                        decision: "approved",
                      })
                    }
                  >
                    <Check aria-hidden="true" size={16} />
                    Approve
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No pending replays"
          description="Controlled replay requests will appear here for authorization."
        />
      )}

      <dialog className="dialog" open={selected !== null}>
        <h2>
          {selected?.decision === "approved"
            ? "Approve request"
            : "Reject request"}
        </h2>
        <p>
          This is a consequential action. The actor, decision, and resource are
          written to the append-only audit history.
        </p>
        {selected?.kind === "workflow" ? (
          <label>
            Decision note
            <textarea
              rows={4}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        ) : null}
        <div className="dialog__actions">
          <Button tone="quiet" onClick={() => setSelected(null)}>
            Cancel
          </Button>
          <Button
            tone={selected?.decision === "rejected" ? "danger" : "primary"}
            loading={decisionMutation.isPending}
            onClick={() => decisionMutation.mutate()}
          >
            Confirm decision
          </Button>
        </div>
      </dialog>
    </>
  );
}
