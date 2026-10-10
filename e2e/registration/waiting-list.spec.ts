import { test, expect } from '../support/test';
import { loginAs, makeTestUser } from '../support/auth';
import { E2E_CONFERENCE_ID } from '../seed/seed';

// Covers the waiting-list signup form - a distinct, simple registration variant not exercised by
// the individual/delegation/supervisor flows.
test('a participant can submit a waiting-list entry', async ({ page }) => {
	const participant = makeTestUser('waiting-list');
	await loginAs(page, participant, {
		startUrl: `/registration/${E2E_CONFERENCE_ID}/waiting-list`
	});

	await page.locator('input[name="school"]').fill('E2E Test School');
	await page.locator('textarea[name="motivation"]').fill('I want to be on the waiting list.');
	await page.locator('textarea[name="experience"]').fill('Some experience.');
	await page.locator('form button.btn-primary').first().click();

	await expect(page.getByText(/auf der warteliste eingetragen|on the waiting list/i)).toBeVisible({
		timeout: 15_000
	});

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { waitingListEntries(where: { conferenceId: { eq: "${E2E_CONFERENCE_ID}" }, userId: { eq: "${participant.preferred_username}" } }) { school } }`
		}
	});
	const entry = (await res.json())?.data?.waitingListEntries?.[0];
	expect(entry?.school).toBe('E2E Test School');
});
