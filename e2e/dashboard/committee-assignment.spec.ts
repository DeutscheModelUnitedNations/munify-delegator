import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_COMMITTEE_ASSIGN_HEAD_USER_ID,
	E2E_COMMITTEE_ID,
	E2E_CONFERENCE_ID
} from '../seed/seed';

// Covers the head delegate assigning delegation members to committees post-assignment - a
// self-service step that happens after the admin has assigned the delegation a nation, with no
// admin in the loop for this specific action.
test('a head delegate can assign a delegation member to a committee', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_COMMITTEE_ASSIGN_HEAD_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/committee-assignment`
	});

	// Each member picks a committee from the ones seating the delegation's nation.
	const committeeChoice = page.getByRole('radio', { name: 'E2E', exact: true });
	// This page fires two parallel liveQuery calls (delegationMembers, committees) on top of the
	// layout's own queries (conferences, breadcrumb conference lookup, impersonation status), which
	// measurably pushes first render past 15s under load - give it more room than a single-query page.
	await expect(committeeChoice).toBeVisible({ timeout: 30_000 });
	// The committee that does not seat the nation is not offered at all.
	await expect(page.getByRole('radio', { name: 'NOIT' })).toHaveCount(0);
	await committeeChoice.click();

	await page.getByRole('button', { name: 'Speichern' }).click();

	await expect(page.getByText(/erfolgreich verteilt|successfully assigned/i)).toBeVisible({
		timeout: 15_000
	});

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { delegationMembers(where: { conference: { id: { eq: "${E2E_CONFERENCE_ID}" } }, user: { id: { eq: "${E2E_COMMITTEE_ASSIGN_HEAD_USER_ID}" } } }) { assignedCommittee { id } } }`
		}
	});
	const data = (await res.json())?.data?.delegationMembers?.[0];
	expect(data?.assignedCommittee?.id).toBe(E2E_COMMITTEE_ID);
});
