import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    // This would need proper authentication setup
    await page.goto("/sign-in");
    // await page.fill('input[name="email"]', 'test@example.com');
    // await page.fill('input[name="password"]', 'password');
    // await page.click('button[type="submit"]');
  });

  test("should display dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("h1")).toContainText("Dashboard");
  });

  test("should display stats cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="stat-card"]')).toHaveCount(4);
  });

  test("should navigate to contacts page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('a[href="/dashboard/contacts"]');
    await expect(page).toHaveURL("/dashboard/contacts");
    await expect(page.locator("h1")).toContainText("Contacts");
  });

  test("should navigate to transactions page", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click('a[href="/dashboard/transactions"]');
    await expect(page).toHaveURL("/dashboard/transactions");
    await expect(page.locator("h1")).toContainText("Transactions");
  });
});
