import { test, expect } from '@playwright/test';
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
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/committeeAssignment`
	});

	const committeeSelect = page.locator('select.select');
	await expect(committeeSelect).toBeVisible({ timeout: 15_000 });
	await committeeSelect.selectOption({ label: 'E2E' });

	await page.getByRole('button', { name: 'Speichern' }).click();

	await expect(page.getByText(/erfolgreich verteilt|successfully assigned/i)).toBeVisible({
		timeout: 15_000
	});

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findUniqueDelegationMember(where: { conferenceId_userId: { conferenceId: "${E2E_CONFERENCE_ID}", userId: "${E2E_COMMITTEE_ASSIGN_HEAD_USER_ID}" } }) { assignedCommittee { id } } }`
		}
	});
	const data = (await res.json())?.data?.findUniqueDelegationMember;
	expect(data?.assignedCommittee?.id).toBe(E2E_COMMITTEE_ID);
});
