import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_SEAT_CONFERENCE_ID, E2E_SEAT_PM_ID } from '../seed/seatPlanning';

// A live list has to follow rows that somebody else creates and deletes. The query and the
// subscription of a live query are separate fields to graphcache, so this only works because
// `liveQueryUpdates` ($lib/api/cacheUpdates.ts) writes each subscription result onto the query.
test('a live list shows rows created and deleted elsewhere', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SEAT_PM_ID), {
		startUrl: `/dashboard/${E2E_SEAT_CONFERENCE_ID}/management/configuration?tab=committees`
	});
	await page.getByRole('heading', { name: /Generalversammlung/ }).waitFor({ timeout: 15_000 });

	// The writes go through the API directly, as another session's would - never through this page.
	const abbreviation = `L${Date.now() % 100000}`;
	const created = await page.request.post('/api/graphql', {
		data: {
			query: `mutation { createCommittee(conferenceId: "${E2E_SEAT_CONFERENCE_ID}", name: "Live", abbreviation: "${abbreviation}", numOfSeatsPerDelegation: 1) { id } }`
		}
	});
	const id: string = (await created.json()).data.createCommittee.id;

	const heading = page.getByRole('heading', { name: `Live (${abbreviation})` });
	await expect(heading).toHaveCount(1, { timeout: 15_000 });
	// It used to flicker in and vanish again when the stale query result came back.
	await page.waitForTimeout(2_000);
	await expect(heading).toHaveCount(1);

	await page.request.post('/api/graphql', {
		data: { query: `mutation { deleteCommittee(id: "${id}") }` }
	});
	await expect(heading).toHaveCount(0, { timeout: 15_000 });
});
