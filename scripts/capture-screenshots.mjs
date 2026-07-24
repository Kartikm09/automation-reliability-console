import { mkdir } from "node:fs/promises";

import { chromium } from "@playwright/test";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
};

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173";
const outputDirectory = "docs/screenshots";

async function signIn(page, email, password) {
  await page.goto(`${baseUrl}/sign-in`);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByRole("heading", { name: "Operations overview" }).waitFor();
}

async function capture(page, name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
  await page.screenshot({
    path: `${outputDirectory}/${name}.png`,
    animations: "disabled",
    fullPage: false,
  });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const adminContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await adminContext.newPage();

await signIn(
  page,
  process.env.E2E_ADMIN_EMAIL ?? "admin@atlas-automation.test",
  required("E2E_ADMIN_PASSWORD"),
);
await capture(page, "dashboard");

await page.goto(`${baseUrl}/runs`);
await page.getByRole("heading", { name: "Workflow runs" }).waitFor();
await capture(page, "workflow-runs");
const runPath = await page
  .locator('a[href^="/runs/"]')
  .first()
  .getAttribute("href");
if (!runPath) throw new Error("A seeded workflow run is required.");
await page.goto(`${baseUrl}${runPath}`);
await page.getByText("Run steps").waitFor();
await capture(page, "run-detail");

await page.goto(`${baseUrl}/incidents`);
await page.getByRole("heading", { name: "Incidents" }).waitFor();
const incidentPath = await page
  .locator('a[href^="/incidents/"]')
  .first()
  .getAttribute("href");
if (!incidentPath) throw new Error("A seeded incident is required.");
await page.goto(`${baseUrl}${incidentPath}`);
await page.getByText("Incident timeline").waitFor();
await capture(page, "incident-detail");

await page.goto(`${baseUrl}/integrations`);
await page.getByRole("heading", { name: "Integrations" }).waitFor();
await capture(page, "integrations");

await page.goto(`${baseUrl}/audit`);
await page.getByRole("heading", { name: "Audit history" }).waitFor();
await capture(page, "audit-history");

const deniedContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const deniedPage = await deniedContext.newPage();
await signIn(
  deniedPage,
  process.env.E2E_SECOND_ORG_EMAIL ?? "owner@northstar-workflow.test",
  required("E2E_SECOND_ORG_PASSWORD"),
);
await deniedPage.goto(`${baseUrl}${runPath}`);
await deniedPage.getByText("Run not found or access denied.").waitFor();
await capture(deniedPage, "cross-tenant-denial");

await deniedContext.close();
await adminContext.close();
await browser.close();
console.log("Captured 7 verified portfolio screenshots.");
