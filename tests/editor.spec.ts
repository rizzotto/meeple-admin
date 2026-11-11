import { test, expect } from "@playwright/test";
test("edits templates, guards unsaved changes, validates JSON and previews scores", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?preview=1");
  await expect(
    page.getByRole("heading", { name: "Scoring templates", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Template name", { exact: true })
    .fill("Everdell house rules");
  await expect(page.locator(".score-sheet h2")).toHaveText(
    "Everdell house rules",
  );
  await page
    .getByRole("button", { name: "New template", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByLabel("Template name", { exact: true })).toHaveValue(
    "Everdell house rules",
  );
  await page
    .getByRole("button", { name: "New template", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await page.getByLabel("Template name", { exact: true }).fill("House score");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByLabel("Category 2 label")).toBeVisible();
  await page.getByRole("button", { name: "Remove New category" }).click();
  await page.getByLabel("Meeple game key").fill("everdell");
  await page.getByRole("button", { name: "Publish revision" }).click();
  await expect(page.getByRole("alert")).toContainText("Preview mode");
  await page.getByRole("tab", { name: "Advanced JSON" }).click();
  await page.getByLabel("Template JSON").fill("{");
  await expect(
    page.getByRole("button", { name: "Publish revision" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Apply JSON" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(errors).toEqual([]);
});
test("renders desktop and mobile without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/?preview=1");
  await page.screenshot({
    path: "tests/screenshots/desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Scoring templates", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "tests/screenshots/mobile.png",
    fullPage: true,
  });
});
test("connected entry shows sign in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});
