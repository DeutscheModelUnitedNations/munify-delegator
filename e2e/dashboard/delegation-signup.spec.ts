import { test, expect, acceptDialogs } from '../support/test';
import { loginAs, makeTestUser, waitForHydration } from '../support/auth';
import {
	chooseApplyPath,
	fillApplicationSteps,
	openFirstConferenceForRegistration
} from '../support/registration';

// Covers the delegation dashboard's self-service "complete signup" wizard - creating a
// delegation, inviting a second member, setting 3 role preferences, then finalizing. Unlike
// registration/delegation.spec.ts (which stops once the delegation exists), this is what a
// delegation actually spends most of its time doing before assignment, and none of it has a
// human admin in the loop watching for a broken button.
test('a head delegate can set preferences and complete their delegation signup', async ({
	browser
}) => {
	// Two separate sign-ups, each through the full login and profile flow, plus the flow itself
	// run within a few seconds of the default 30s.
	test.setTimeout(90_000);

	const headContext = await browser.newContext();
	const headPage = await headContext.newPage();
	await acceptDialogs(headPage);

	const headDelegate = makeTestUser('signup-head');
	await loginAs(headPage, headDelegate);
	const conferenceId = await openFirstConferenceForRegistration(headPage);

	await chooseApplyPath(headPage, /Delegation erstellen/);

	const schoolInput = headPage.locator('input[name="schoolName"]');
	await expect(async () => {
		await headPage.getByRole('button', { name: /weiter|next/i }).click();
		await expect(schoolInput).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });

	await fillApplicationSteps(headPage, {
		school: 'E2E Test School',
		motivation: 'We want to join.',
		experience: 'Some experience.'
	});

	const entryCodeLocator = headPage.locator('p.font-mono');
	await expect(entryCodeLocator).toBeVisible({ timeout: 15_000 });
	const entryCode = (await entryCodeLocator.textContent())?.trim();
	expect(entryCode).toBeTruthy();

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
	const modal = headPage.locator('dialog.modal');
	// Scoped to the pool's own add-buttons (not the "your preferences" table, which uses the
	// same icon set once populated) so the count check below only tracks the pool shrinking.
	const poolAddButtons = modal.locator('.collapse-content button:has(.fa-chevrons-up)');
	const openPool = async () => {
		await headPage.reload();
		await waitForHydration(headPage);
		await headPage.getByRole('button', { name: 'Wünsche festlegen' }).click();
		// The collapse-title text itself isn't clickable - daisyUI overlays the actual toggle
		// checkbox on top of it (which is what needs the click).
		await modal
			.locator('.collapse', { hasText: 'Länderpool' })
			.locator('input[type="checkbox"]')
			.click();
		await expect(poolAddButtons.first()).toBeVisible({ timeout: 15_000 });
	};

	// The wishes so far, a row each with its remove button. Counted rather than the pool shrinking:
	// the pool is every nation seating the delegation, which specs running beside this one change.
	const wishRows = modal.locator('tr:has(button .fa-xmark)');

	await openPool();
	expect(await poolAddButtons.count()).toBeGreaterThanOrEqual(3);
	for (let i = 1; i <= 3; i++) {
		await poolAddButtons.first().click();
		// Wait for the mutation to land before adding the next. A wish added while the modal's
		// subscription is still computing its first result is not announced to it (see the live
		// lists spec); opened afresh, the modal shows what the server holds.
		await expect(wishRows)
			.toHaveCount(i, { timeout: 5_000 })
			.catch(async () => {
				await openPool();
				await expect(wishRows).toHaveCount(i, { timeout: 15_000 });
			});
	}
	await modal.getByRole('button', { name: 'Schließen', exact: true }).click();
	await expect(modal).toBeHidden({ timeout: 15_000 });

	const completeSignupButton = headPage.getByRole('button', {
		name: 'Bewerbung verbindlich abschließen und damit am Auswahlverfahren teilnehmen'
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
			query: `query { delegations(where: { entryCode: { eq: "${entryCode}" } }) { applied appliedForRoles { id } } }`
		}
	});
	const json = await res.json();
	expect(json.data?.delegations?.[0]?.applied).toBe(true);
	expect(json.data?.delegations?.[0]?.appliedForRoles?.length).toBe(3);
});
