import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { openFirstConferenceForRegistration } from '../support/registration';

// Covers the delegation dashboard's self-service "complete signup" wizard - creating a
// delegation, inviting a second member, setting 3 role preferences, then finalizing. Unlike
// registration/delegation.spec.ts (which stops once the delegation exists), this is what a
// delegation actually spends most of its time doing before assignment, and none of it has a
// human admin in the loop watching for a broken button.
test('a head delegate can set preferences and complete their delegation signup', async ({
	browser
}) => {
	const headContext = await browser.newContext();
	const headPage = await headContext.newPage();
	headPage.on('dialog', (dialog) => dialog.accept());

	const headDelegate = makeTestUser('signup-head');
	await loginAs(headPage, headDelegate, { startUrl: '/registration' });
	const conferenceId = await openFirstConferenceForRegistration(headPage);

	await headPage.locator('a[href$="/create-delegation"]').click();
	await headPage.waitForURL(/\/create-delegation$/);

	const schoolInput = headPage.locator('input[name="school"]');
	await expect(async () => {
		await headPage.getByRole('button', { name: /weiter|next/i }).click();
		await expect(schoolInput).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });

	await schoolInput.fill('E2E Test School');
	await headPage.locator('textarea[name="motivation"]').fill('We want to join.');
	await headPage.locator('textarea[name="experience"]').fill('Some experience.');
	await headPage.locator('form button.btn-primary').first().click();

	const entryCodeLocator = headPage.locator('p.font-mono');
	await expect(entryCodeLocator).toBeVisible({ timeout: 15_000 });
	const entryCode = (await entryCodeLocator.textContent())?.trim();
	expect(entryCode).toBeTruthy();

	await headPage.getByRole('link', { name: /zum dashboard|to dashboard/i }).click();
	await headPage.waitForURL(/\/dashboard(\/.+)?$/, { timeout: 15_000 });

	// --- second member joins, so "invite people" reads as completed ---
	const memberContext = await browser.newContext();
	const memberPage = await memberContext.newPage();
	const member = makeTestUser('signup-member');
	await loginAs(memberPage, member, {
		startUrl: `/registration/${conferenceId}/join-delegation`
	});
	await memberPage.locator('input[placeholder="Code"]').fill(entryCode!);
	const confirmButton = memberPage.getByRole('button', { name: /bestätigen|confirm/i });
	await expect(confirmButton).toBeVisible({ timeout: 15_000 });
	await confirmButton.click();
	await memberPage.waitForURL(new RegExp(`/dashboard/${conferenceId}$`), { timeout: 15_000 });
	await memberContext.close();

	// --- back on the head delegate's dashboard: set 3 preferences and complete signup ---
	await headPage.reload();
	await waitForHydration(headPage);
	await headPage.getByRole('button', { name: 'Wünsche festlegen' }).click();

	const modal = headPage.locator('dialog.modal');
	// The collapse-title text itself isn't clickable - daisyUI overlays the actual toggle
	// checkbox on top of it (which is what needs the click).
	await modal
		.locator('.collapse', { hasText: 'Länderpool' })
		.locator('input[type="checkbox"]')
		.click();
	// Scoped to the pool's own add-buttons (not the "your preferences" table, which uses the
	// same icon set once populated) so the count check below only tracks the pool shrinking.
	const poolAddButtons = modal.locator('.collapse-content button:has(.fa-chevrons-up)');
	const initialPoolSize = await poolAddButtons.count();
	expect(initialPoolSize).toBeGreaterThanOrEqual(3);
	for (let i = 1; i <= 3; i++) {
		await poolAddButtons.first().click();
		// wait for the mutation to land (pool shrinks by one) before adding the next
		await expect(poolAddButtons).toHaveCount(initialPoolSize - i, { timeout: 15_000 });
	}
	await modal.locator('button[aria-label="Close"]').click();
	await expect(modal).toBeHidden({ timeout: 15_000 });

	const completeSignupButton = headPage.getByRole('button', {
		name: 'Anmeldung verbindlich abschließen und damit am Auswahlverfahren teilnehmen'
	});
	// The button is gated on the delegation's member and role-application counts. Closing the
	// preferences modal does not always land the cache invalidation that refreshes them, leaving
	// the button disabled against data that is already complete server-side. Reload until the
	// page reflects reality - a genuinely incomplete delegation still fails here.
	await expect(async () => {
		await expect(completeSignupButton).toBeEnabled({ timeout: 5_000 });
	})
		.toPass({ timeout: 45_000, intervals: [1_000] })
		.catch(async () => {
			await headPage.reload();
			await waitForHydration(headPage);
			await expect(completeSignupButton).toBeEnabled({ timeout: 15_000 });
		});
	await completeSignupButton.click();

	await expect(
		headPage.getByText(/erfolgreich abgeschlossen|successfully completed/i).first()
	).toBeVisible({ timeout: 15_000 });

	const res = await headPage.request.post('/api/graphql', {
		data: {
			query: `query { findManyDelegations(where: { entryCode: { equals: "${entryCode}" } }) { applied appliedForRoles { id } } }`
		}
	});
	const json = await res.json();
	expect(json.data?.findManyDelegations?.[0]?.applied).toBe(true);
	expect(json.data?.findManyDelegations?.[0]?.appliedForRoles?.length).toBe(3);
});
