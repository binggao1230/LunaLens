import { expect, test } from '@playwright/test';

test('shows lunar learning facts and all curated sites on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore the Moon');
  await page.getByText('Moon light and temperature').click();
  await expect(page.getByText(/127°C/)).toBeVisible();

  await page.locator('ion-select.language-select').click();
  await page.getByText('FR', { exact: true }).last().click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explorer la Lune');

  const shell = page.locator('.welcome-shell');
  const fitsPhoneWidth = await shell.evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(fitsPhoneWidth).toBe(true);

  await page.locator('ion-button.launch-button').click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('#site-choice ion-select-option')).toHaveCount(12);
  await page.locator('.site-details summary').click();
  await expect(page.locator('.site-details-body')).toContainText('Coordonnées');
  await page.getByRole('button', { name: 'Voir cette journée' }).click();
  await page.locator('.reading-note summary').click();
  await expect(page.locator('.reading-note')).toContainText('Comment lire la frise horaire');
});
