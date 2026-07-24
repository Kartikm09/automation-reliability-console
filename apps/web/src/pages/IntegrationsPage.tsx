import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Blocks,
  Check,
  Copy,
  KeyRound,
  Plus,
  RotateCw,
  Webhook,
} from "lucide-react";
import { useState } from "react";

import { integrationSourceSchema } from "@arc/contracts";
import type { Provider } from "@arc/contracts";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useOrganization } from "../context/OrganizationContext";
import { useToast } from "../context/ToastContext";
import { environment } from "../env";
import { errorMessage } from "../lib/errors";
import { formatRelative, titleCase } from "../lib/format";
import { supabase } from "../lib/supabase";
import type { IntegrationSource } from "../types";

interface Environment {
  id: string;
  name: string;
  environment_type: string;
}

interface IntegrationData {
  environments: Environment[];
  sources: IntegrationSource[];
}

interface OneTimeCredential {
  credential: string;
  prefix: string;
  sourceName: string;
}

async function loadIntegrations(
  organizationId: string,
): Promise<IntegrationData> {
  const [sources, environments] = await Promise.all([
    supabase
      .from("integration_sources_public")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at"),
    supabase
      .from("environments")
      .select("id, name, environment_type")
      .eq("organization_id", organizationId)
      .order("name"),
  ]);
  if (sources.error) throw sources.error;
  if (environments.error) throw environments.error;
  return {
    sources: (sources.data ?? []) as IntegrationSource[],
    environments: (environments.data ?? []) as Environment[],
  };
}

export function IntegrationsPage() {
  const { organization, membership } = useOrganization();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [credential, setCredential] = useState<OneTimeCredential | null>(null);
  const [rotationSource, setRotationSource] =
    useState<IntegrationSource | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<Provider>("custom");
  const [environmentId, setEnvironmentId] = useState("");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "integrations"],
    queryFn: () => loadIntegrations(organization!.id),
    enabled: Boolean(organization),
  });
  const canManage = membership && ["owner", "admin"].includes(membership.role);

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsed = integrationSourceSchema.parse({
        environment_id: environmentId,
        name,
        provider_type: provider,
      });
      const { error } = await supabase.from("integration_sources").insert({
        ...parsed,
        organization_id: organization!.id,
        status: "active",
        public_configuration: { schema_version: "1" },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notify("Integration source created.");
      setCreateOpen(false);
      setName("");
      setEnvironmentId("");
      void queryClient.invalidateQueries({
        queryKey: ["organization", organization?.id],
      });
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });

  const credentialMutation = useMutation({
    mutationFn: async ({
      functionName,
      source,
    }: {
      functionName:
        "create-integration-credential" | "rotate-integration-credential";
      source: IntegrationSource;
    }) => {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { integration_source_id: source.id },
      });
      if (error) throw error;
      if (
        !data?.credential ||
        typeof data.credential !== "string" ||
        typeof data.prefix !== "string"
      ) {
        throw new Error("Credential generation returned an invalid response.");
      }
      return {
        credential: data.credential as string,
        prefix: data.prefix as string,
        sourceName: source.name,
      };
    },
    onSuccess: (result) => {
      setCredential(result);
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
  const { sources, environments } = query.data!;

  return (
    <>
      <PageHeader
        eyebrow="Provider intake"
        title="Integrations"
        description="Signed webhook sources for n8n, Make, Zapier, and custom services."
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus aria-hidden="true" size={16} />
              Add source
            </Button>
          ) : null
        }
      />
      <div className="endpoint-band">
        <Webhook aria-hidden="true" size={20} />
        <div>
          <span>Webhook endpoint</span>
          <code>
            {environment.VITE_SUPABASE_URL}/functions/v1/ingest-execution-event
          </code>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label="Copy webhook endpoint"
          title="Copy webhook endpoint"
          onClick={() => {
            void navigator.clipboard.writeText(
              `${environment.VITE_SUPABASE_URL}/functions/v1/ingest-execution-event`,
            );
            notify("Webhook endpoint copied.");
          }}
        >
          <Copy aria-hidden="true" size={17} />
        </button>
      </div>

      {sources.length ? (
        <section className="integration-grid">
          {sources.map((source) => (
            <article className="integration-card" key={source.id}>
              <header>
                <span className="provider-icon">
                  <Blocks aria-hidden="true" size={19} />
                </span>
                <StatusBadge value={source.status} />
              </header>
              <p className="eyebrow">{titleCase(source.provider_type)}</p>
              <h2>{source.name}</h2>
              <dl>
                <div>
                  <dt>Credential prefix</dt>
                  <dd>
                    <code>{source.webhook_key_prefix ?? "Not generated"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Last event</dt>
                  <dd>{formatRelative(source.last_event_at)}</dd>
                </div>
              </dl>
              {canManage ? (
                <Button
                  tone="secondary"
                  loading={credentialMutation.isPending}
                  onClick={() => {
                    if (source.webhook_key_prefix) {
                      setRotationSource(source);
                    } else {
                      credentialMutation.mutate({
                        functionName: "create-integration-credential",
                        source,
                      });
                    }
                  }}
                >
                  {source.webhook_key_prefix ? (
                    <RotateCw aria-hidden="true" size={16} />
                  ) : (
                    <KeyRound aria-hidden="true" size={16} />
                  )}
                  {source.webhook_key_prefix
                    ? "Rotate credential"
                    : "Generate credential"}
                </Button>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No integration sources"
          description="An owner or administrator can add the first provider source."
        />
      )}

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Signing contract</p>
            <h2>Sample request</h2>
          </div>
        </div>
        <pre className="code-sample">
          <code>{`timestamp="$(date +%s)"
body='{"event_id":"evt-demo-001","workflow_id":"wf-demo","run_id":"run-demo-001","status":"succeeded","event_timestamp":"2026-07-24T08:00:05Z"}'
signature="$(printf '%s' "$timestamp.$body" | openssl dgst -sha256 -hmac "$WEBHOOK_KEY" -hex | sed 's/^.* //')"

curl -X POST "$WEBHOOK_URL" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Key: $WEBHOOK_KEY" \\
  -H "X-Webhook-Timestamp: $timestamp" \\
  -H "X-Webhook-Signature: sha256=$signature" \\
  --data "$body"`}</code>
        </pre>
      </section>

      <dialog
        aria-labelledby="add-integration-source-title"
        className="dialog"
        open={createOpen}
      >
        <h2 id="add-integration-source-title">Add integration source</h2>
        <p>
          Source metadata is visible to operators; secret material is never
          returned after creation.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <label>
            Source name
            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Provider
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value as Provider)}
            >
              <option value="custom">Custom</option>
              <option value="n8n">n8n</option>
              <option value="make">Make</option>
              <option value="zapier">Zapier</option>
            </select>
          </label>
          <label>
            Environment
            <select
              required
              value={environmentId}
              onChange={(event) => setEnvironmentId(event.target.value)}
            >
              <option value="">Select environment</option>
              {environments.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="dialog__actions">
            <Button
              tone="quiet"
              type="button"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={createMutation.isPending} type="submit">
              Create source
            </Button>
          </div>
        </form>
      </dialog>

      <dialog
        aria-labelledby="credential-created-title"
        className="dialog dialog--credential"
        open={credential !== null}
      >
        <span className="credential-success">
          <Check aria-hidden="true" size={19} />
        </span>
        <h2 id="credential-created-title">Store this credential now</h2>
        <p>
          {credential?.sourceName} will never display this plaintext credential
          again. Rotation revokes the previous value.
        </p>
        <div className="credential-value">
          <code>{credential?.credential}</code>
          <button
            className="icon-button"
            type="button"
            aria-label="Copy credential"
            title="Copy credential"
            onClick={() => {
              if (credential) {
                void navigator.clipboard.writeText(credential.credential);
                notify("Credential copied.");
              }
            }}
          >
            <Copy aria-hidden="true" size={17} />
          </button>
        </div>
        <Button
          onClick={() => {
            setCredential(null);
            notify("Credential display closed.");
          }}
        >
          I stored it securely
        </Button>
      </dialog>
      <ConfirmDialog
        confirmLabel="Rotate credential"
        description="The current credential will stop working immediately. Store the replacement when it is displayed."
        loading={credentialMutation.isPending}
        onCancel={() => setRotationSource(null)}
        onConfirm={() => {
          if (!rotationSource) return;
          credentialMutation.mutate({
            functionName: "rotate-integration-credential",
            source: rotationSource,
          });
          setRotationSource(null);
        }}
        open={rotationSource !== null}
        title="Rotate this webhook credential?"
      />
    </>
  );
}
