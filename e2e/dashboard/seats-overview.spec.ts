import { test, expect } from '../support/test';
import { loginAs, makeTestUser } from '../support/auth';
import { E2E_CONFERENCE_ID } from '../seed/seed';

// The seat overview is part of the dashboard: it needs a login and keeps the app's navigation.
test('the seat overview renders inside the app for a signed-in user', async ({ page }) => {
	await loginAs(page, makeTestUser('seats-reader'), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/seats`
	});

	await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
	await expect(page.locator('header, nav').first()).toBeVisible();
});

test('the old public seat URL is gone', async ({ page }) => {
	const res = await page.goto(`/seats/${E2E_CONFERENCE_ID}`);
	expect(res?.status()).toBe(404);
});
