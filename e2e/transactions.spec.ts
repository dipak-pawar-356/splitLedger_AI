import { test, expect } from "@playwright/test";

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto("/sign-in");
    // Authentication setup
  });

  test("should display transactions list", async ({ page }) => {
    await page.goto("/dashboard/transactions");
    await expect(page.locator("h1")).toContainText("Transactions");
    await expect(page.locator('[data-testid="transaction-item"]')).toBeVisible();
  });

  test("should open create transaction modal", async ({ page }) => {
    await page.goto("/dashboard/transactions");
    await page.click('button:has-text("Add Transaction")');
    await expect(page.locator('[data-testid="transaction-modal"]')).toBeVisible();
  });

  test("should create new transaction", async ({ page }) => {
    await page.goto("/dashboard/transactions");
    await page.click('button:has-text("Add Transaction")');
    
    await page.fill('input[name="amount"]', "100");
    await page.fill('input[name="description"]', "Test transaction");
    await page.selectOption('select[name="type"]', "paid");
    
    await page.click('button:has-text("Create")');
    
    await expect(page.locator('[data-testid="transaction-modal"]')).not.toBeVisible();
  });
});
