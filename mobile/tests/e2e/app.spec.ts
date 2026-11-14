import { expect, test } from '@playwright/test';

test('welcomes learners and opens the lunar lesson on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Moon mission starts');
  await page.getByText('Sunlight', { exact: true }).first().click();
  await expect(page.getByText(/Low hills can hide the Sun/)).toBeVisible();

  const shell = page.locator('.welcome-shell');
  const fitsPhoneWidth = await shell.evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(fitsPhoneWidth).toBe(true);

  await page.locator('ion-button.launch-button').click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What can you see from the Moon?');
});
