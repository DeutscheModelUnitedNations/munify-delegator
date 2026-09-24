import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID, E2E_MGMT_TARGET_FAMILY_NAME } from '../seed/seed';

test('a team member can mark a participant payment status as done from the participants table', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		// Filter to the target via the page's `search` query param. The participants table
		// paginates, and every run adds newly registered users to this conference, so the seeded
		// target eventually falls off the first page and a bare row lookup starts timing out.
		startUrl: `/management/${E2E_CONFERENCE_ID}/participants?search=${E2E_MGMT_TARGET_FAMILY_NAME}`
	});

	const targetRow = page.locator('tr', { hasText: E2E_MGMT_TARGET_FAMILY_NAME });
	await expect(targetRow).toBeVisible({ timeout: 15_000 });
	await targetRow.click();

	await page.getByRole('tab', { name: /status|dtatus/i }).click();

	const paymentDoneButton = page.locator('.card:has(.fa-money-bill) button[aria-label="DONE"]');
	await expect(paymentDoneButton).toBeVisible({ timeout: 15_000 });
	await paymentDoneButton.click();

	await expect(paymentDoneButton).toHaveClass(/btn-success/, { timeout: 15_000 });
});
