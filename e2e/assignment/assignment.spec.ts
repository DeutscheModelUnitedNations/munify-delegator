import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_ASSIGNMENT_DELEGATION_ID,
	E2E_ASSIGNMENT_NATION_ALPHA3,
	E2E_CONFERENCE_ID,
	E2E_SPLIT_DELEGATION_ID,
	E2E_SPLIT_MEMBER_1_ID,
	E2E_SPLIT_MEMBER_2_ID
} from '../seed/seed';

// The draft is planned through the API: the board's drag and drop (@thisux/sveltednd) is flaky to
// drive from Playwright and not what is under test here. Applying goes through the finish tab,
// which is. Both tests apply the whole draft of the same conference, so they run one after the
// other.
test.describe.configure({ mode: 'serial' });

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return (await res.json()) as GraphQLResult;
}

async function applyFromFinishTab(page: Page) {
	await page.goto(`/dashboard/${E2E_CONFERENCE_ID}/management/assignment/finish`);
	await waitForHydration(page);
	const apply = page.getByRole('button', { name: /zuteilung übernehmen|apply assignment/i });
	await expect(apply.first()).toBeEnabled({ timeout: 15_000 });
	await apply.first().click();
	const modal = page.locator('.modal-open, dialog[open]');
	await modal.getByRole('button', { name: /zuteilung übernehmen|apply assignment/i }).click();
	await expect(page.getByText(/keine geplanten änderungen|no planned changes/i)).toBeVisible({
		timeout: 15_000
	});
}

test('an admin plans a nation for a delegation and applies it', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/assignment/sighting`
	});

	const planned = await gql(
		page,
		`mutation ($d: ID!, $n: String) { assignDelegation(delegationId: $d, nationAlpha3Code: $n) }`,
		{ d: E2E_ASSIGNMENT_DELEGATION_ID, n: E2E_ASSIGNMENT_NATION_ALPHA3 }
	);
	expect(planned.data?.assignDelegation, JSON.stringify(planned)).toBe(true);

	// Planned is not applied: the registration is untouched until the finish tab writes it.
	const before = await gql(
		page,
		`query ($d: ID!) { delegation(id: $d) { assignedNationAlpha3Code } }`,
		{ d: E2E_ASSIGNMENT_DELEGATION_ID }
	);
	expect(before.data?.delegation).toEqual({ assignedNationAlpha3Code: null });

	await applyFromFinishTab(page);

	await expect
		.poll(
			async () => {
				const json = await gql(
					page,
					`query ($d: ID!) { delegation(id: $d) { assignedNation { alpha3Code } } }`,
					{ d: E2E_ASSIGNMENT_DELEGATION_ID }
				);
				const delegation = json.data?.delegation as
					{ assignedNation: { alpha3Code: string } | null } | undefined;
				return delegation?.assignedNation?.alpha3Code;
			},
			{ timeout: 15_000 }
		)
		.toBe(E2E_ASSIGNMENT_NATION_ALPHA3);
});

test('an admin splits a delegation into two single-member delegations', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/assignment/delegations`
	});

	const memberIds = await gql(page, `query ($d: ID!) { delegation(id: $d) { members { id } } }`, {
		d: E2E_SPLIT_DELEGATION_ID
	});
	const members = (memberIds.data?.delegation as { members: { id: string }[] }).members;
	expect(members).toHaveLength(2);

	const split = await gql(
		page,
		`mutation ($d: ID!, $p: [AssignmentSplitPartInput!]!) { splitDelegation(delegationId: $d, parts: $p) }`,
		{ d: E2E_SPLIT_DELEGATION_ID, p: members.map((member) => ({ memberIds: [member.id] })) }
	);
	expect(split.data?.splitDelegation, JSON.stringify(split)).toBe(true);

	await applyFromFinishTab(page);

	await expect
		.poll(
			async () => {
				const userIds = JSON.stringify([E2E_SPLIT_MEMBER_1_ID, E2E_SPLIT_MEMBER_2_ID]);
				const json = await gql(
					page,
					`query {
						delegationMembers(where: { conferenceId: { eq: "${E2E_CONFERENCE_ID}" }, userId: { in: ${userIds} } }) {
							delegation { id members { id } }
						}
					}`
				);
				const rows = (json.data?.delegationMembers ?? []) as {
					delegation: { id: string; members: { id: string }[] };
				}[];
				const delegationIds = new Set(rows.map((row) => row.delegation.id));
				return {
					delegations: delegationIds.size,
					parentGone: !delegationIds.has(E2E_SPLIT_DELEGATION_ID),
					eachAlone: rows.every((row) => row.delegation.members.length === 1)
				};
			},
			{ timeout: 15_000 }
		)
		.toEqual({ delegations: 2, parentGone: true, eachAlone: true });
});
