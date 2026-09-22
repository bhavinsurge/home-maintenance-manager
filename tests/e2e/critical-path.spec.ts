import { expect, test } from "@playwright/test";

const email = `e2e-${Date.now()}@example.com`;
const password = "Password123!";

test("register → household → asset → schedule → complete", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app");

  await page.getByRole("button", { name: "New household" }).click();
  await page.getByLabel("Household name").fill("E2E Household");
  await page.getByRole("button", { name: "Create household" }).click();
  await page.getByRole("link", { name: /E2E Household/ }).click();
  await page.waitForURL("**/households/**");

  await page.getByRole("link", { name: "Manage assets" }).click();
  await page.getByRole("button", { name: "Add asset" }).click();
  await page.getByLabel("Name").fill("E2E Dishwasher");
  await page.getByRole("button", { name: "Save asset" }).click();
  await page.getByRole("link", { name: /E2E Dishwasher/ }).click();

  await page.getByLabel("Schedule title").fill("Descaler rinse");
  await page.getByLabel("Next due").fill("2026-04-01T10:00");
  await page.getByRole("button", { name: "Add schedule" }).click();
  await expect(page.getByText("Schedule created")).toBeVisible();

  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByText("Maintenance marked complete")).toBeVisible();
  await expect(page.getByText("Descaler rinse").first()).toBeVisible();
});
