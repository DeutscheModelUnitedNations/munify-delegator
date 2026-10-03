import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

// Covers the single-participant dashboard's self-service tools - adding a second role
// application, deleting one, and completing signup - none of which is exercised by
// registration/individual.spec.ts (which only covers the initial application).
test('a single participant can manage role applications and complete their signup', async ({
	page
}) => {
	page.on('dialog', (dialog) => dialog.accept());

	const participant = makeTestUser('single-signup');
	await loginAs(page, participant, { startUrl: '/registration' });
	const conferenceId = await openFirstConferenceForRegistration(page);

	await page.locator('a[href$="/individual"]').click();
	await page.waitForURL(/\/individual$/);
	await page.locator('main a.btn-primary').first().click();
	await page.waitForURL(/\/individual\/[^/]+$/);

	await page.locator('input[name="school"]').fill('E2E Test School');
	await page.locator('textarea[name="motivation"]').fill('I want to represent my country.');
	await page.locator('textarea[name="experience"]').fill('This is my first conference.');
	await page.locator('form button.btn-primary').first().click();
	await page.waitForURL(/\/dashboard(\/.+)?$/, { timeout: 15_000 });
	await waitForHydration(page);

	// --- add a second role application ---
	await page.getByRole('link', { name: 'Weitere Bewerbung hinzufügen' }).click();
	await page.waitForURL(/\/individual$/);
	// Both role cards are shown regardless of existing applications - target the second role by
	// name specifically, since both cards' apply buttons read the same "Bewerben" text.
	await page.locator('.card', { hasText: 'E2E Test Role 2' }).locator('a.btn-primary').click();
	await page.waitForURL(/\/individual\/[^/]+$/);
	await page.locator('form button.btn-primary').first().click();
	await page.waitForURL(/\/dashboard(\/.+)?$/, { timeout: 15_000 });
	await waitForHydration(page);

	const roleRows = page
		.locator('section', { hasText: 'Rollenbewerbungen' })
		.locator('table tbody tr');
	await expect(roleRows).toHaveCount(2, { timeout: 15_000 });

	// --- delete the first application (only possible now that there are 2) ---
	await roleRows.first().locator('button:not([disabled])').click();
	await expect(roleRows).toHaveCount(1, { timeout: 15_000 });

	// --- complete signup ---
	const completeSignupButton = page.getByRole('button', {
		name: 'Anmeldung verbindlich abschließen und damit am Auswahlverfahren teilnehmen'
	});
	await expect(completeSignupButton).toBeEnabled({ timeout: 15_000 });
	await completeSignupButton.click();
	await expect(
		page.getByText(/erfolgreich abgeschlossen|successfully completed/i).first()
	).toBeVisible({ timeout: 15_000 });

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findUniqueSingleParticipant(where: { conferenceId_userId: { conferenceId: "${conferenceId}", userId: "${participant.preferred_username}" } }) { applied appliedForRoles { id } } }`
		}
	});
	const data = (await res.json())?.data?.findUniqueSingleParticipant;
	expect(data?.applied).toBe(true);
	expect(data?.appliedForRoles?.length).toBe(1);
});
