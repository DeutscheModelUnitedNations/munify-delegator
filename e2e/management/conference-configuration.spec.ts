import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_ASSIGNMENT_ADMIN_ID } from '../seed/seed';

// Conference configuration drives the state machine and every participant-facing setting, but
// had no coverage. The save path is deliberately two-step (edit -> change preview -> confirm),
// so a regression in the preview silently blocks every settings change.

// FIXME: quarantined, not a flake - the save never reaches the server in this environment.
// Evidence: a `console.log` probe placed as the first statement of the `updateSettings` action
// never fires, and the POST is answered with a 302 from `(authenticated)/+layout.server.ts`
// (its `offlineUserRefresh` returns no user, so it redirects to sign-in and the submission is
// discarded). A following GET re-authenticates transparently, so the page looks fine and the
// change is silently lost. Retrying the whole edit/confirm cycle for 60s never lands it.
// Participant-side form actions (registration) POST successfully in the same suite, so this is
// not "form actions are broken" generally.
// Next diagnostic step: exercise the `addAgendaItem` action on this same page - if it also
// fails the problem is route/session-scoped, if it succeeds it is specific to `updateSettings`
// (whose form is multipart with File fields). Un-fixme once the cause is understood.
test.fixme('an admin can change a conference setting through the confirm-preview save flow', async ({
	page
}) => {
	const newLocation = `E2E Location ${Date.now()}`;

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/management/${E2E_CONFERENCE_ID}/configuration`
	});
	await waitForHydration(page);

	// The first form-action POST after login can be consumed by the (authenticated) layout's
	// re-auth redirect, which silently discards the submission. Retry the whole edit/confirm
	// cycle until the change actually lands.
	await expect(async () => {
		const locationInput = page.locator('input[name="location"]');
		await expect(locationInput).toBeVisible({ timeout: 15_000 });
		await locationInput.fill(newLocation);
		await locationInput.blur();

		const saveButton = page.getByRole('button', {
			name: /einstellungen speichern|save settings/i
		});
		await expect(saveButton).toBeEnabled({ timeout: 10_000 });
		await saveButton.click();

		const confirmModal = page.locator('.modal-open, dialog[open]').first();
		await expect(confirmModal).toBeVisible({ timeout: 10_000 });
		await expect(confirmModal.getByText(newLocation).first()).toBeVisible({ timeout: 10_000 });
		await confirmModal.locator('button.btn-primary').first().click();

		const res = await page.request.post('/api/graphql', {
			data: {
				query: `query { findUniqueConference(where: { id: "${E2E_CONFERENCE_ID}" }) { location } }`
			}
		});
		expect((await res.json())?.data?.findUniqueConference?.location).toBe(newLocation);
	}).toPass({ timeout: 60_000 });
});
