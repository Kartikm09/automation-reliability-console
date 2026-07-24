import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Building2, Plus, UserRoundCog } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useOrganization } from "../context/OrganizationContext";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../lib/errors";
import { titleCase } from "../lib/format";
import { supabase } from "../lib/supabase";

interface SettingsData {
  environments: Array<{
    id: string;
    name: string;
    slug: string;
    environment_type: string;
  }>;
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    membership_status: string;
  }>;
  notificationRules: Array<{
    id: string;
    name: string;
    enabled: boolean;
    event_type: string;
    minimum_severity: string;
    channel_type: string;
  }>;
  profile: { display_name: string; avatar_path: string | null } | null;
}

async function loadSettings(
  organizationId: string,
  userId: string,
): Promise<SettingsData> {
  const [members, environments, notificationRules, profile] = await Promise.all(
    [
      supabase
        .from("organization_members")
        .select("id, user_id, role, membership_status")
        .eq("organization_id", organizationId)
        .order("created_at"),
      supabase
        .from("environments")
        .select("id, name, slug, environment_type")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("notification_rules")
        .select("id, name, enabled, event_type, minimum_severity, channel_type")
        .eq("organization_id", organizationId)
        .order("name"),
      supabase
        .from("profiles")
        .select("display_name, avatar_path")
        .eq("id", userId)
        .maybeSingle(),
    ],
  );
  if (members.error) throw members.error;
  if (environments.error) throw environments.error;
  if (notificationRules.error) throw notificationRules.error;
  if (profile.error) throw profile.error;
  return {
    members: members.data ?? [],
    environments: environments.data ?? [],
    notificationRules: notificationRules.data ?? [],
    profile: profile.data,
  };
}

export function SettingsPage() {
  const { user } = useAuth();
  const { organization, membership } = useOrganization();
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<"workspace" | "team" | "notifications">(
    () =>
      new URLSearchParams(window.location.search).get("view") ===
      "notifications"
        ? "notifications"
        : "workspace",
  );
  const [displayName, setDisplayName] = useState("");
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [newEnvironmentType, setNewEnvironmentType] = useState("development");
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const query = useQuery({
    queryKey: ["organization", organization?.id, "settings", user?.id],
    queryFn: () => loadSettings(organization!.id, user!.id),
    enabled: Boolean(organization && user),
  });
  const canManage = membership && ["owner", "admin"].includes(membership.role);
  const effectiveDisplayName =
    displayName || query.data?.profile?.display_name || "";

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ["organization", organization?.id],
    });
  const profileMutation = useMutation({
    mutationFn: async () => {
      const nextName = effectiveDisplayName.trim();
      if (nextName.length < 2) throw new Error("Display name is too short.");
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: nextName })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      notify("Profile settings saved.");
      void refresh();
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });
  const environmentMutation = useMutation({
    mutationFn: async () => {
      const name = newEnvironmentName.trim();
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("environments").insert({
        organization_id: organization!.id,
        name,
        slug,
        environment_type: newEnvironmentType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notify("Environment added.");
      setNewEnvironmentName("");
      void refresh();
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });
  const memberMutation = useMutation({
    mutationFn: async ({
      memberId,
      role,
    }: {
      memberId: string;
      role: string;
    }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      notify("Member role updated.");
      void refresh();
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });
  const ruleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notification_rules").insert({
        organization_id: organization!.id,
        name: ruleName.trim(),
        enabled: true,
        event_type: "incident.created",
        minimum_severity: "high",
        channel_type: "in_app",
        destination_configuration: {},
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      notify("Notification rule created.");
      setRuleName("");
      setRuleOpen(false);
      void refresh();
    },
    onError: (error) => notify(errorMessage(error), "error"),
  });
  const ruleToggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("notification_rules")
        .update({ enabled })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void refresh(),
    onError: (error) => notify(errorMessage(error), "error"),
  });

  const views = useMemo(
    () => [
      { id: "workspace" as const, label: "Workspace", icon: Building2 },
      { id: "team" as const, label: "Team", icon: UserRoundCog },
      { id: "notifications" as const, label: "Notifications", icon: BellRing },
    ],
    [],
  );

  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState message={errorMessage(query.error)} />;
  const data = query.data!;

  return (
    <>
      <PageHeader
        eyebrow={organization?.name}
        title="Settings"
        description="Profile, organization environments, member roles, and incident notification rules."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {views.map(({ icon: Icon, id, label }) => (
            <button
              className={view === id ? "is-selected" : ""}
              key={id}
              type="button"
              onClick={() => setView(id)}
            >
              <Icon aria-hidden="true" size={17} />
              {label}
            </button>
          ))}
        </nav>
        <section className="panel settings-panel">
          {view === "workspace" ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Personal</p>
                  <h2>Profile</h2>
                </div>
              </div>
              <form
                className="settings-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  profileMutation.mutate();
                }}
              >
                <label>
                  Display name
                  <input
                    minLength={2}
                    maxLength={120}
                    required
                    value={effectiveDisplayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </label>
                <Button loading={profileMutation.isPending} type="submit">
                  Save profile
                </Button>
              </form>
              <div className="section-heading section-heading--bordered">
                <div>
                  <p className="eyebrow">Runtime separation</p>
                  <h2>Environments</h2>
                </div>
              </div>
              <div className="environment-list">
                {data.environments.map((item) => (
                  <div key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.slug}</small>
                    </span>
                    <StatusBadge value={item.environment_type} />
                  </div>
                ))}
              </div>
              {canManage ? (
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    environmentMutation.mutate();
                  }}
                >
                  <input
                    aria-label="New environment name"
                    minLength={2}
                    required
                    placeholder="Environment name"
                    value={newEnvironmentName}
                    onChange={(event) =>
                      setNewEnvironmentName(event.target.value)
                    }
                  />
                  <select
                    aria-label="Environment type"
                    value={newEnvironmentType}
                    onChange={(event) =>
                      setNewEnvironmentType(event.target.value)
                    }
                  >
                    <option value="development">Development</option>
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                  <Button loading={environmentMutation.isPending} type="submit">
                    <Plus aria-hidden="true" size={16} />
                    Add
                  </Button>
                </form>
              ) : null}
            </>
          ) : null}

          {view === "team" ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Tenant membership</p>
                  <h2>Team roles</h2>
                </div>
                <span className="section-heading__meta">
                  {data.members.length} members
                </span>
              </div>
              <div className="member-list">
                {data.members.map((item) => (
                  <div key={item.id}>
                    <span className="member-avatar">
                      {item.user_id.slice(0, 2).toUpperCase()}
                    </span>
                    <span>
                      <strong>
                        {item.user_id === user?.id
                          ? "You"
                          : `Member ${item.user_id.slice(0, 8)}`}
                      </strong>
                      <small>{titleCase(item.membership_status)}</small>
                    </span>
                    {canManage && item.user_id !== user?.id ? (
                      <select
                        aria-label={`Role for member ${item.user_id.slice(0, 8)}`}
                        value={item.role}
                        onChange={(event) =>
                          memberMutation.mutate({
                            memberId: item.id,
                            role: event.target.value,
                          })
                        }
                      >
                        <option value="viewer">Viewer</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                        {membership?.role === "owner" ? (
                          <option value="owner">Owner</option>
                        ) : null}
                      </select>
                    ) : (
                      <StatusBadge value={item.role} />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {view === "notifications" ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Incident routing</p>
                  <h2>Notification rules</h2>
                </div>
                {canManage ? (
                  <Button tone="secondary" onClick={() => setRuleOpen(true)}>
                    <Plus aria-hidden="true" size={16} />
                    Add rule
                  </Button>
                ) : null}
              </div>
              {data.notificationRules.length ? (
                <div className="rule-list">
                  {data.notificationRules.map((rule) => (
                    <div key={rule.id}>
                      <span>
                        <strong>{rule.name}</strong>
                        <small>
                          {titleCase(rule.event_type)} ·{" "}
                          {titleCase(rule.minimum_severity)}+
                        </small>
                      </span>
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          disabled={!canManage || ruleToggleMutation.isPending}
                          onChange={(event) =>
                            ruleToggleMutation.mutate({
                              id: rule.id,
                              enabled: event.target.checked,
                            })
                          }
                        />
                        <span aria-hidden="true" />
                        <span className="sr-only">Enable {rule.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No notification rules"
                  description="Create a rule to route high-severity incident events into the in-app queue."
                />
              )}
            </>
          ) : null}
        </section>
      </div>

      <dialog className="dialog" open={ruleOpen}>
        <h2>Add notification rule</h2>
        <p>
          This first rule routes high-severity incident creation events to the
          in-app queue.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            ruleMutation.mutate();
          }}
        >
          <label>
            Rule name
            <input
              required
              minLength={2}
              maxLength={120}
              value={ruleName}
              onChange={(event) => setRuleName(event.target.value)}
            />
          </label>
          <div className="dialog__actions">
            <Button
              tone="quiet"
              type="button"
              onClick={() => setRuleOpen(false)}
            >
              Cancel
            </Button>
            <Button loading={ruleMutation.isPending} type="submit">
              Create rule
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
