import { test, expect, acceptDialogs } from '../support/test';
import { loginAs, makeTestUser } from '../support/auth';
import {
	chooseApplyPath,
	fillApplicationSteps,
	openFirstConferenceForRegistration
} from '../support/registration';

// Covers the single-participant dashboard's self-service tools - adding a second role
// application, deleting one, and completing signup - none of which is exercised by
// registration/individual.spec.ts (which only covers the initial application).
test('a single participant can manage role applications and complete their signup', async ({
	page
}) => {
	await acceptDialogs(page);

	const participant = makeTestUser('single-signup');
	await loginAs(page, participant);
	const conferenceId = await openFirstConferenceForRegistration(page);

	await chooseApplyPath(page, /Einzelbewerbung/);
	// By exact name: the second role is added from the dashboard below.
	await page
		.locator('ol .card .card')
		.filter({ has: page.getByText('E2E Test Role', { exact: true }) })
		.getByRole('button')
		.click();

	await fillApplicationSteps(page, {
		school: 'E2E Test School',
		motivation: 'I want to represent my country.',
		experience: 'This is my first conference.'
	});

	// --- add a second role application, right there on the dashboard ---
	await page.getByRole('button', { name: 'Weitere Bewerbung hinzufügen' }).click({
		timeout: 15_000
	});
	await page.locator('.card .card', { hasText: 'E2E Test Role 2' }).getByRole('button').click();

	const roleRows = page.locator('section', { hasText: 'Rollenbewerbungen' }).locator('ul li');
	await expect(roleRows).toHaveCount(2, { timeout: 15_000 });

	// --- delete the first application (only possible now that there are 2) ---
	await roleRows.first().locator('button:not([disabled])').click();
	await expect(roleRows).toHaveCount(1, { timeout: 15_000 });

	// --- complete signup ---
	const completeSignupButton = page.getByRole('button', {
		name: 'Bewerbung verbindlich abschließen und damit am Auswahlverfahren teilnehmen'
	});
	await expect(completeSignupButton).toBeEnabled({ timeout: 15_000 });
	await completeSignupButton.click();
	await expect(
		page.getByText(/erfolgreich abgeschlossen|successfully completed/i).first()
	).toBeVisible({ timeout: 15_000 });

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { singleParticipants(where: { conference: { id: { eq: "${conferenceId}" } }, user: { id: { eq: "${participant.preferred_username}" } } }) { applied appliedForRoles { id } } }`
		}
	});
	const data = (await res.json())?.data?.singleParticipants?.[0];
	expect(data?.applied).toBe(true);
	expect(data?.appliedForRoles?.length).toBe(1);
});
