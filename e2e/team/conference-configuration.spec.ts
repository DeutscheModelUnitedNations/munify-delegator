import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_ASSIGNMENT_ADMIN_ID } from '../seed/seed';

// Conference configuration drives the state machine and every participant-facing setting, but
// had no coverage. The save path is deliberately two-step (edit -> change preview -> confirm),
// so a regression in the preview silently blocks every settings change.

test('an admin can change a conference setting through the confirm-preview save flow', async ({
	page
}) => {
	const newLocation = `E2E Location ${Date.now()}`;

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/configuration`
	});
	await waitForHydration(page);

	const locationInput = page.locator('input[name="location"]');
	await expect(locationInput).toBeVisible({ timeout: 15_000 });
	await locationInput.fill(newLocation);
	await locationInput.blur();

	await page
		.getByRole('button', { name: /einstellungen speichern|save settings/i })
		.last()
		.click();
	const confirmModal = page.locator('.modal-open, dialog[open]').first();
	await expect(confirmModal.getByText(newLocation).first()).toBeVisible();
	await confirmModal.getByRole('button', { name: /^(speichern|save)$/i }).click();

	await expect
		.poll(async () => {
			const res = await page.request.post('/api/graphql', {
				data: { query: `query { conference(id: "${E2E_CONFERENCE_ID}") { location } }` }
			});
			return (await res.json())?.data?.conference?.location;
		})
		.toBe(newLocation);
});
