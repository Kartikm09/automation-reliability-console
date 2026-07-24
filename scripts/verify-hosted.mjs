import { createHash, randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

function requiredEnvironment(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function client(url, key) {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function signIn(supabase, email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user || !data.session) {
    throw error ?? new Error(`Could not sign in ${email}.`);
  }
  await supabase.realtime.setAuth(data.session.access_token);
  return data.user;
}

async function subscribe(channel, expectedStatus, timeoutMs = 12_000) {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Realtime did not reach ${expectedStatus}.`));
    }, timeoutMs);
    channel.subscribe((status) => {
      if (status === expectedStatus) {
        clearTimeout(timeout);
        resolve();
      }
      if (
        expectedStatus !== "CHANNEL_ERROR" &&
        (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
      ) {
        clearTimeout(timeout);
        reject(new Error(`Realtime subscription failed with ${status}.`));
      }
    });
  });
}

const url = requiredEnvironment("E2E_SUPABASE_URL");
const publishableKey = requiredEnvironment("E2E_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = requiredEnvironment("E2E_SUPABASE_SERVICE_ROLE_KEY");
const adminPassword = requiredEnvironment("E2E_ADMIN_PASSWORD");
const secondOrgPassword = requiredEnvironment("E2E_SECOND_ORG_PASSWORD");
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@atlas-automation.test";
const secondOrgEmail =
  process.env.E2E_SECOND_ORG_EMAIL ?? "owner@northstar-workflow.test";

const admin = client(url, publishableKey);
const outsider = client(url, publishableKey);
const service = client(url, serviceRoleKey);
const cleanup = [];
let adminChannel;
let outsiderChannel;

try {
  const adminUser = await signIn(admin, adminEmail, adminPassword);
  await signIn(outsider, secondOrgEmail, secondOrgPassword);

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("name", "Atlas Automation Labs")
    .single();
  if (organizationError) throw organizationError;

  const { data: run, error: runError } = await admin
    .from("workflow_runs")
    .select("id, workflow_definition_id")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (runError) throw runError;

  const fileContents = "Synthetic hosted storage verification artifact.\n";
  const artifactId = randomUUID();
  const storagePath = `${organization.id}/${run.id}/${artifactId}/hosted-smoke.txt`;
  const { error: uploadError } = await admin.storage
    .from("execution-artifacts")
    .upload(storagePath, new Blob([fileContents], { type: "text/plain" }), {
      contentType: "text/plain",
      upsert: false,
    });
  if (uploadError) throw uploadError;
  cleanup.push(async () => {
    await service.storage.from("execution-artifacts").remove([storagePath]);
  });

  const { error: artifactError } = await service.from("run_artifacts").insert({
    id: artifactId,
    organization_id: organization.id,
    workflow_run_id: run.id,
    storage_path: storagePath,
    original_filename: "hosted-smoke.txt",
    mime_type: "text/plain",
    byte_size: Buffer.byteLength(fileContents),
    sha256_hash: createHash("sha256").update(fileContents).digest("hex"),
    uploaded_by: adminUser.id,
  });
  if (artifactError) throw artifactError;
  cleanup.push(async () => {
    await service.from("run_artifacts").delete().eq("id", artifactId);
  });

  const { data: signedArtifact, error: signedArtifactError } =
    await admin.functions.invoke("get-signed-artifact-url", {
      body: { artifact_id: artifactId },
    });
  if (signedArtifactError || !signedArtifact?.signed_url) {
    throw signedArtifactError ?? new Error("Signed URL was not returned.");
  }
  const artifactResponse = await fetch(signedArtifact.signed_url);
  if (
    !artifactResponse.ok ||
    (await artifactResponse.text()) !== fileContents
  ) {
    throw new Error("Authorized signed artifact download did not match.");
  }

  const { data: outsiderArtifact, error: outsiderArtifactError } =
    await outsider.functions.invoke("get-signed-artifact-url", {
      body: { artifact_id: artifactId },
    });
  if (!outsiderArtifactError || outsiderArtifact?.signed_url) {
    throw new Error("A different organization obtained an artifact URL.");
  }

  const { data: incident, error: incidentError } = await service
    .from("incidents")
    .insert({
      organization_id: organization.id,
      workflow_definition_id: run.workflow_definition_id,
      workflow_run_id: run.id,
      severity: "low",
      title: "Hosted Realtime Verification",
      summary: "Synthetic incident used to verify private Broadcast delivery.",
      detection_source: "hosted_smoke_test",
    })
    .select("id")
    .single();
  if (incidentError) throw incidentError;

  const eventReceived = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Expected private Broadcast was not received.")),
      12_000,
    );
    adminChannel = admin
      .channel(`org:${organization.id}:incidents`, {
        config: { private: true },
      })
      .on("broadcast", { event: "incident.updated" }, ({ payload }) => {
        if (
          payload.incident_id === incident.id &&
          payload.status === "acknowledged"
        ) {
          clearTimeout(timeout);
          resolve();
        }
      });
  });
  await subscribe(adminChannel, "SUBSCRIBED");

  outsiderChannel = outsider.channel(`org:${organization.id}:incidents`, {
    config: { private: true },
  });
  await subscribe(outsiderChannel, "CHANNEL_ERROR");

  const { error: transitionError } = await admin.rpc("transition_incident", {
    target_incident_id: incident.id,
    target_status: "acknowledged",
    transition_note: "Private Realtime hosted verification.",
  });
  if (transitionError) throw transitionError;
  await eventReceived;

  for (const status of ["resolved", "closed"]) {
    const { error } = await admin.rpc("transition_incident", {
      target_incident_id: incident.id,
      target_status: status,
      transition_note: "Hosted verification cleanup.",
    });
    if (error) throw error;
  }

  console.log(
    "Hosted storage authorization, signed download, cross-tenant denial, and private Realtime checks passed.",
  );
} finally {
  if (adminChannel) await admin.removeChannel(adminChannel);
  if (outsiderChannel) await outsider.removeChannel(outsiderChannel);
  for (const action of cleanup.reverse()) {
    await action();
  }
  await admin.auth.signOut();
  await outsider.auth.signOut();
  admin.realtime.disconnect();
  outsider.realtime.disconnect();
}
