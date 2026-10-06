import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_CONFERENCE_ID,
	E2E_SPLIT_DELEGATION_ID,
	E2E_SPLIT_MEMBER_1_ID,
	E2E_SPLIT_MEMBER_2_ID
} from '../seed/seed';

// Covers the other branch of sendAssignmentData (src/api/resolvers/modules/assignments.ts) that
// the plain nation-assignment test (assignment.spec.ts) doesn't reach: splitting one delegation
// into several. The resolver hard-deletes the parent and creates a fresh Delegation per child.
test('an admin can split a delegation into two single-member delegations', async ({ page }) => {
	page.on('dialog', (dialog) => dialog.accept());

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/management/${E2E_CONFERENCE_ID}/assignment`
	});

	const projectData = {
		conference: {
			id: E2E_CONFERENCE_ID,
			title: 'E2E Test Conference',
			startConference: new Date().toISOString(),
			committees: [],
			nonStateActors: [],
			individualApplicationOptions: []
		},
		delegations: [
			{
				id: E2E_SPLIT_DELEGATION_ID,
				appliedForRoles: [],
				members: [
					{ id: 'm1', isHeadDelegate: true, user: { id: E2E_SPLIT_MEMBER_1_ID } },
					{ id: 'm2', isHeadDelegate: false, user: { id: E2E_SPLIT_MEMBER_2_ID } }
				],
				splittedInto: ['child-1', 'child-2']
			},
			{
				id: 'child-1',
				appliedForRoles: [],
				members: [{ id: 'm1', isHeadDelegate: true, user: { id: E2E_SPLIT_MEMBER_1_ID } }],
				splittedFrom: E2E_SPLIT_DELEGATION_ID
			},
			{
				id: 'child-2',
				appliedForRoles: [],
				members: [{ id: 'm2', isHeadDelegate: true, user: { id: E2E_SPLIT_MEMBER_2_ID } }],
				splittedFrom: E2E_SPLIT_DELEGATION_ID
			}
		],
		singleParticipants: []
	};

	await page.locator('input[type="file"]').setInputFiles({
		name: 'split.json',
		mimeType: 'application/json',
		buffer: Buffer.from(JSON.stringify(projectData))
	});

	const applyButton = page.getByRole('button', { name: /zuweisung anwenden|apply assignment/i });
	await expect(applyButton).toBeEnabled({ timeout: 10_000 });
	await applyButton.click();

	async function graphql(query: string) {
		const res = await page.request.post('/api/graphql', { data: { query } });
		return (await res.json())?.data;
	}

	// The parent delegation should be gone, and each split member should now be head delegate of
	// their own new, single-member delegation.
	await expect
		.poll(
			async () => {
				const data = await graphql(
					`query { findUniqueDelegation(where: { id: "${E2E_SPLIT_DELEGATION_ID}" }) { id } }`
				);
				return data?.findUniqueDelegation;
			},
			{ timeout: 15_000 }
		)
		.toBeNull();

	for (const memberId of [E2E_SPLIT_MEMBER_1_ID, E2E_SPLIT_MEMBER_2_ID]) {
		const data = await graphql(
			`query { findUniqueDelegationMember(where: { conferenceId_userId: { conferenceId: "${E2E_CONFERENCE_ID}", userId: "${memberId}" } }) { isHeadDelegate delegation { id } } }`
		);
		expect(data?.findUniqueDelegationMember?.isHeadDelegate).toBe(true);
		expect(data?.findUniqueDelegationMember?.delegation?.id).not.toBe(E2E_SPLIT_DELEGATION_ID);
	}
});
