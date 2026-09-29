import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

test('a new user can register as an individual participant', async ({ page }) => {
	const user = makeTestUser('individual');
	await loginAs(page, user, { startUrl: '/registration' });

	await openFirstConferenceForRegistration(page);

	await page.locator('a[href$="/individual"]').click();
	await page.waitForURL(/\/individual$/);

	// pick the first available role
	await page.locator('main a.btn-primary').first().click();
	await page.waitForURL(/\/individual\/[^/]+$/);

	await page.locator('input[name="school"]').fill('E2E Test School');
	await page.locator('textarea[name="motivation"]').fill('I want to represent my country.');
	await page.locator('textarea[name="experience"]').fill('This is my first conference.');

	await page.locator('form button.btn-primary').first().click();

	// The app redirects to /dashboard, which itself redirects to /dashboard/{conferenceId}
	// once the user has exactly one conference to show.
	await page.waitForURL(/\/dashboard(\/.+)?$/);
	await expect(page).toHaveURL(/\/dashboard(\/.+)?$/);
});
