import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should display sign in page", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveTitle(/Sign In/);
    await expect(page.locator("h1")).toContainText("Sign In");
  });

  test("should redirect to dashboard after sign in", async ({ page }) => {
    // This test would need valid credentials or mock authentication
    await page.goto("/sign-in");
    // Sign in flow would go here
    // await page.fill('input[name="email"]', 'test@example.com');
    // await page.fill('input[name="password"]', 'password');
    // await page.click('button[type="submit"]');
    // await expect(page).toHaveURL("/dashboard");
  });

  test("should redirect to sign in when accessing protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });
});
