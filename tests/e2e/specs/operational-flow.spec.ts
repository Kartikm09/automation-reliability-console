import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@atlas-automation.test";
const adminPassword = requiredEnvironment("E2E_ADMIN_PASSWORD");
const internalFunctionToken = requiredEnvironment("INTERNAL_FUNCTION_TOKEN");
const supabaseUrl = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the operational E2E suite.`);
  }
  return value;
}

test("signed failure event creates an incident and completes controlled replay", async ({
  page,
  request,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const sourceName = `E2E Custom ${suffix}`;
  const workflowName = `E2E Reliability Check ${suffix}`;
  const runId = `run-e2e-failed-${suffix}`;
  const replayReason = `Retry after the fictional dependency recovers (${suffix}).`;

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(adminEmail);
  await page.getByLabel("Password").fill(adminPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(
    page.getByRole("heading", { name: "Operations overview" }),
  ).toBeVisible();

  await page.goto("/integrations");
  await page.getByRole("button", { name: "Add source" }).click();
  const createDialog = page.getByRole("dialog", {
    name: "Add integration source",
  });
  await createDialog.getByLabel("Source name").fill(sourceName);
  await createDialog.getByLabel("Provider").selectOption("custom");
  await createDialog.getByLabel("Environment").selectOption({ index: 1 });
  await createDialog.getByRole("button", { name: "Create source" }).click();

  const sourceCard = page
    .locator(".integration-card")
    .filter({ hasText: sourceName });
  await expect(sourceCard).toBeVisible();
  const credentialResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/functions/v1/create-integration-credential") &&
      response.request().method() === "POST",
  );
  await sourceCard.getByRole("button", { name: "Generate credential" }).click();
  const credentialResponse = await credentialResponsePromise;
  expect(credentialResponse.status()).toBe(201);
  const credentialDialog = page.getByRole("dialog", {
    name: "Store this credential now",
  });
  await expect(credentialDialog).toBeVisible();
  const credential = await credentialDialog.locator("code").innerText();
  expect(credential).toMatch(/^wh_[A-Za-z0-9_-]{10}\./);
  await credentialDialog
    .getByRole("button", { name: "I stored it securely" })
    .click();

  const now = new Date();
  const endedAt = now.toISOString();
  const startedAt = new Date(now.getTime() - 4_000).toISOString();
  const body = JSON.stringify({
    event_id: `evt-${suffix}`,
    event_timestamp: endedAt,
    event_type: "run.failed",
    workflow_id: `wf-${suffix}`,
    workflow_name: workflowName,
    run_id: runId,
    status: "failed",
    trigger_type: "webhook",
    started_at: startedAt,
    ended_at: endedAt,
    schema_version: "2",
    input_summary: { record_count: 3, api_token: "must-be-redacted" },
    output_summary: { processed: 1 },
    error: {
      code: "SYNTHETIC_DEPENDENCY",
      message: "A fictional downstream dependency rejected the request.",
    },
    steps: [
      {
        id: "validate",
        sequence_number: 1,
        name: "Validate records",
        status: "succeeded",
        duration_ms: 1000,
      },
      {
        id: "deliver",
        sequence_number: 2,
        name: "Deliver records",
        status: "failed",
        duration_ms: 3000,
        error: {
          code: "SYNTHETIC_DEPENDENCY",
          message: "Fictional endpoint unavailable.",
        },
      },
    ],
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", credential)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const ingestResponse = await request.post(
    `${supabaseUrl}/functions/v1/ingest-execution-event`,
    {
      data: body,
      headers: {
        "content-type": "application/json",
        "x-webhook-key": credential,
        "x-webhook-signature": `sha256=${signature}`,
        "x-webhook-timestamp": timestamp,
      },
    },
  );
  expect(ingestResponse.status()).toBe(202);

  const firstWorkerResponse = await request.post(
    `${supabaseUrl}/functions/v1/process-queues`,
    { headers: { "x-internal-token": internalFunctionToken } },
  );
  expect(firstWorkerResponse.ok()).toBeTruthy();

  await page.goto("/runs");
  await expect(page.getByText(runId)).toBeVisible();
  await page.getByRole("link", { name: `Open run ${runId}` }).click();
  await expect(page.getByText("api_token")).toHaveCount(0);
  await page.getByRole("button", { name: "Request replay" }).click();
  await page.getByLabel("Operational reason").fill(replayReason);
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByText("Replay request created")).toBeVisible();

  await page.goto("/incidents");
  await expect(page.getByText(`${workflowName} failed`)).toBeVisible();
  await page
    .getByRole("link", { name: `Open incident ${workflowName} failed` })
    .click();
  await page.getByRole("button", { name: "Acknowledge" }).click();
  await page
    .getByLabel("Operational note")
    .fill("Synthetic signal reviewed during automated E2E verification.");
  await page.getByRole("button", { name: "Confirm transition" }).click();
  await expect(page.getByText("Acknowledged")).toBeVisible();

  await page.goto("/approvals");
  await page.getByRole("tab", { name: /Replay requests/ }).click();
  const replayRow = page.locator(".approval-row").filter({
    hasText: replayReason,
  });
  await replayRow.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: "Confirm decision" }).click();

  const secondWorkerResponse = await request.post(
    `${supabaseUrl}/functions/v1/process-queues`,
    { headers: { "x-internal-token": internalFunctionToken } },
  );
  expect(secondWorkerResponse.ok()).toBeTruthy();

  await page.goto("/audit");
  await expect(page.getByText("Replay Succeeded").first()).toBeVisible();
  await expect(
    page.getByText("Workflow Run Event Applied").first(),
  ).toBeVisible();
});
