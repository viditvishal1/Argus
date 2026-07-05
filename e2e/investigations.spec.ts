import { test, expect } from "@playwright/test";

test("investigations route is reachable", async ({ page }) => {
  await page.goto("/investigations");
  const login = page.getByRole("heading", { name: /Sign in to Argus/i });
  const workspace = page.getByRole("heading", { name: /Investigation workspaces/i });
  await expect(login.or(workspace)).toBeVisible();
  if (await workspace.isVisible()) {
    await expect(page.getByPlaceholder(/New investigation title/i)).toBeVisible();
  } else {
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/Investigations, watchlists/i)).toBeVisible();
  }
});
