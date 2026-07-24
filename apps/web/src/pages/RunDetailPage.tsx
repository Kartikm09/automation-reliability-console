import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Clock3,
  FileText,
  GitBranch,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { formatDateTime, formatDuration, titleCase } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { RunStep, WorkflowRun } from "../types";

interface Artifact {
  id: string;
  original_filename: string;
  mime_type: string;
  byte_size: number;
}

interface RunDetailData {
  artifacts: Artifact[];
  run: WorkflowRun;
  steps: RunStep[];
}

async function loadRunDetail(
  organizationId: string,
  runId: string,
): Promise<RunDetailData> {
  const [run, steps, artifacts] = await Promise.all([
    supabase
      .from("workflow_runs")
      .select("*, workflow_definitions!inner(id, name)")
      .eq("organization_id", organizationId)
      .eq("id", runId)
      .maybeSingle(),
    supabase
      .from("run_steps")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("workflow_run_id", runId)
      .order("sequence_number"),
    supabase
      .from("run_artifacts")
      .select("id, original_filename, mime_type, byte_size")
      .eq("organization_id", organizationId)
      .eq("workflow_run_id", runId)
      .order("created_at"),
  ]);
  if (run.error) throw run.error;
  if (!run.data) throw new Error("Run not found or access denied.");
  if (steps.error) throw steps.error;
  if (artifacts.error) throw artifacts.error;
  return {
    run: run.data as WorkflowRun,
    steps: (steps.data ?? []) as RunStep[],
    artifacts: (artifacts.data ?? []) as Artifact[],
  };
}

function SafeJson({ value }: { value: Record<string, unknown> }) {
  return (
    <pre className="safe-json">
      <code>{JSON.stringify(value, null, 2)}</code>
    </pre>
  );
}

export function RunDetailPage() {
  const { runId = "" } = useParams();
  const { organization, membership } = useOrganization();
  const [replayOpen, setReplayOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["organization", organization?.id, "run", runId],
    queryFn: () => loadRunDetail(organization!.id, runId),
    enabled: Boolean(organization && runId),
  });
  const replayMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "request-replay",
        {
          body: {
            workflow_run_id: runId,
            reason,
            idempotency_key: crypto.randomUUID(),
          },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      notify("Replay request created for controlled processing.");
      setReplayOpen(false);
      setReason("");
      void queryClient.invalidateQueries({
        queryKey: ["organization", organization?.id],
      });
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });
  const artifactMutation = useMutation({
    mutationFn: async (artifactId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "get-signed-artifact-url",
        { body: { artifact_id: artifactId } },
      );
      if (error) throw error;
      if (!data?.signed_url || typeof data.signed_url !== "string") {
        throw new Error("A signed artifact URL was not returned.");
      }
      return data.signed_url as string;
    },
    onSuccess: (signedUrl) => {
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={errorMessage(query.error)} />;
  const { run, steps, artifacts } = query.data!;
  const replayable = ["failed", "timed_out", "cancelled"].includes(run.status);
  const canReplay =
    replayable &&
    membership &&
    ["owner", "admin", "operator"].includes(membership.role);

  return (
    <>
      <Link className="back-link" to="/runs">
        <ArrowLeft aria-hidden="true" size={16} />
        Workflow runs
      </Link>
      <PageHeader
        eyebrow={run.workflow_definitions?.name ?? "Workflow run"}
        title={run.external_run_id}
        description={run.summary ?? "No run summary was recorded."}
        actions={
          <>
            <StatusBadge value={run.status} />
            {canReplay ? (
              <Button tone="secondary" onClick={() => setReplayOpen(true)}>
                <RotateCcw aria-hidden="true" size={16} />
                Request replay
              </Button>
            ) : null}
          </>
        }
      />

      <section className="run-facts">
        <div>
          <span>Started</span>
          <strong>{formatDateTime(run.started_at)}</strong>
        </div>
        <div>
          <span>Duration</span>
          <strong>{formatDuration(run.duration_ms)}</strong>
        </div>
        <div>
          <span>Trigger</span>
          <strong>{titleCase(run.trigger_type)}</strong>
        </div>
        <div>
          <span>Attempt</span>
          <strong>#{run.attempt_number}</strong>
        </div>
      </section>

      {run.parent_run_id ? (
        <div className="relationship-banner">
          <GitBranch aria-hidden="true" size={18} />
          This run is a controlled replay of
          <Link to={`/runs/${run.parent_run_id}`}>the original run</Link>.
        </div>
      ) : null}

      {run.error_message ? (
        <section className="error-detail">
          <AlertTriangle aria-hidden="true" size={20} />
          <div>
            <p className="eyebrow">{run.error_code ?? "Execution error"}</p>
            <h2>{run.error_message}</h2>
          </div>
        </section>
      ) : null}

      <section className="detail-grid">
        <div className="panel panel--wide">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Canonical timeline</p>
              <h2>Run steps</h2>
            </div>
            <Clock3 aria-hidden="true" size={18} />
          </div>
          {steps.length ? (
            <div className="step-timeline">
              {steps.map((step) => (
                <div className="step" key={step.id}>
                  <span className={`step__marker step__marker--${step.status}`}>
                    {step.sequence_number}
                  </span>
                  <div>
                    <strong>{step.name}</strong>
                    <small>{titleCase(step.step_type)}</small>
                  </div>
                  <StatusBadge value={step.status} />
                  <span>{formatDuration(step.duration_ms)}</span>
                  {step.error_message ? (
                    <p className="step__error">
                      {step.error_code ? `${step.error_code}: ` : ""}
                      {step.error_message}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No step-level events"
              description="The source event did not include a step timeline."
            />
          )}
        </div>
        <aside className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Private storage</p>
              <h2>Artifacts</h2>
            </div>
            <Boxes aria-hidden="true" size={18} />
          </div>
          {artifacts.length ? (
            <div className="artifact-list">
              {artifacts.map((artifact) => (
                <button
                  className="artifact"
                  type="button"
                  key={artifact.id}
                  onClick={() => artifactMutation.mutate(artifact.id)}
                >
                  <FileText aria-hidden="true" size={18} />
                  <span>
                    <strong>{artifact.original_filename}</strong>
                    <small>
                      {artifact.mime_type} ·{" "}
                      {Math.ceil(artifact.byte_size / 1024)} KB
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No artifacts"
              description="Authorized private artifacts will appear here."
            />
          )}
        </aside>
      </section>

      <section className="summary-grid">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Redacted</p>
              <h2>Input summary</h2>
            </div>
          </div>
          <SafeJson value={run.input_summary} />
        </div>
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Redacted</p>
              <h2>Output summary</h2>
            </div>
          </div>
          <SafeJson value={run.output_summary} />
        </div>
      </section>

      <dialog className="dialog" open={replayOpen}>
        <h2>Request controlled replay</h2>
        <p>
          The replay remains linked to this run and every action is audited.
          This reference implementation does not invoke a real external
          provider.
        </p>
        <label>
          Operational reason
          <textarea
            minLength={8}
            maxLength={1000}
            required
            rows={4}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <div className="dialog__actions">
          <Button tone="quiet" onClick={() => setReplayOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={reason.trim().length < 8}
            loading={replayMutation.isPending}
            onClick={() => replayMutation.mutate()}
          >
            Submit request
          </Button>
        </div>
      </dialog>
    </>
  );
}
