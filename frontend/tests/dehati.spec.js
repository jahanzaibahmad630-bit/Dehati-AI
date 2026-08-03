import { test, expect } from '@playwright/test';

const TARGET_URL = process.env.TEST_URL || 'https://dehati-ai.vercel.app';

test.describe('🌾 DehatiAI Mobile PWA End-to-End Automated Test Suite', () => {

  test('1. Guest Login & Auth Navigation', async ({ page }) => {
    await page.goto(`${TARGET_URL}/auth`);
    await expect(page.locator('body')).toBeVisible();
    
    const guestBtn = page.locator('button:has-text("مہمان کے طور پر داخل ہوں")');
    if (await guestBtn.isVisible()) {
      await guestBtn.click();
      await expect(page).toHaveURL(`${TARGET_URL}/`);
    }
  });

  test('2. Chat Page & Visible History Sub-Header Bar', async ({ page }) => {
    await page.goto(`${TARGET_URL}/chat`);
    await expect(page.locator('#chat-input')).toBeVisible();

    // Verify sub-header history button is visible
    const historyBtn = page.locator('#open-history-sidebar-btn');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    // Verify sidebar drawer opens
    await expect(page.locator('text=🌾 DehatiAI')).toBeVisible();
  });

  test('3. Disease Scanner & Catalog 0ms Fail-Safe Check', async ({ page }) => {
    await page.goto(`${TARGET_URL}/disease`);
    await expect(page.locator('#tab-crops-disease')).toBeVisible();

    // Ensure error boundary is NOT triggered
    await expect(page.locator('text=کچھ مسئلہ ہو گیا')).not.toBeVisible();
  });

  test('4. Auto-Updating Punjab Govt Schemes & Kissan Card Calculator', async ({ page }) => {
    await page.goto(`${TARGET_URL}/schemes`);
    await expect(page.locator('text=وزیراعلیٰ پنجاب کسان کارڈ')).toBeVisible();
  });

});
