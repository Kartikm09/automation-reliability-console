import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const administrator = {
  email: process.env.E2E_ADMIN_EMAIL ?? "admin@atlas-automation.test",
  password: requiredEnvironment("E2E_ADMIN_PASSWORD"),
};
const secondTenant = {
  email: process.env.E2E_SECOND_ORG_EMAIL ?? "owner@northstar-workflow.test",
  password: requiredEnvironment("E2E_SECOND_ORG_PASSWORD"),
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the authenticated E2E suite.`);
  }
  return value;
}

async function signIn(page: Page, account: typeof administrator) {
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("administrator sees operational data and can navigate protected views", async ({
  page,
}) => {
  await signIn(page, administrator);
  await expect(
    page.getByRole("heading", { name: "Operations overview" }),
  ).toBeVisible();
  await page.goto("/runs");
  await expect(
    page.getByRole("heading", { name: "Workflow runs" }),
  ).toBeVisible();
  await page.goto("/incidents");
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible();
  await page.goto("/audit");
  await expect(
    page.getByRole("heading", { name: "Audit history" }),
  ).toBeVisible();
});

test("a second organization cannot access the first tenant run by direct URL", async ({
  browser,
}) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await signIn(adminPage, administrator);
  await adminPage.goto("/runs");
  const runLink = adminPage.locator('a[href^="/runs/"]').first();
  const runPath = await runLink.getAttribute("href");
  expect(runPath).toBeTruthy();
  await adminContext.close();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await signIn(secondPage, secondTenant);
  await secondPage.goto(runPath!);
  await expect(
    secondPage.getByText("Run not found or access denied."),
  ).toBeVisible();
  await secondContext.close();
});
