import { test, expect } from "@playwright/test";
test("edits official templates, guards unsaved changes and validates JSON", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?preview=1");
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
  await page
    .getByRole("button", { name: "New template", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await page.getByLabel("Search games").fill("Wingspan");
  await page
    .getByRole("button", { name: "Wingspan Edit official", exact: true })
    .click();
  await expect(page.getByLabel("Game", { exact: true })).toHaveValue(
    "Wingspan",
  );
  await expect(page.getByText("ludo-20418", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Remove New category" }).click();
  await page.getByRole("button", { name: "Save official template" }).click();
  await expect(page.getByRole("alert")).toContainText("Preview mode");
  await page.getByRole("tab", { name: "Advanced JSON" }).click();
  await page.getByLabel("Template JSON").fill("{");
  await expect(
    page.getByRole("button", { name: "Save official template" }),
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
test("connected entry shows password and Google sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google", exact: true }),
  ).toBeVisible();
});
