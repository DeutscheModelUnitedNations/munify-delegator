import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_UNRELEASED_COMMITTEE_ID,
	E2E_UNRELEASED_CONFERENCE_ID,
	E2E_UNRELEASED_NATION_ALPHA3,
	E2E_UNRELEASED_PARTICIPANT_USER_ID
} from '../seed/seed';

// Until the team releases the assignment, a participant must not learn their role through any
// path the API offers: the masked columns, the relations they back, and the relations pointing
// back from the nation and the committee. The release toggle then shows it, and hides it again.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return (await res.json()) as GraphQLResult;
}

/** Everything a participant could ask to find out their nation and committee. */
async function whatTheParticipantSees(page: Page) {
	const result = await gql(
		page,
		`query ($n: ID!, $k: ID!) {
			delegationMembers(where: { conferenceId: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" }, userId: { eq: "${E2E_UNRELEASED_PARTICIPANT_USER_ID}" } }) {
				assignedCommitteeId
				assignedCommittee { id }
				delegation { assignedNationAlpha3Code assignedNation { alpha3Code } }
			}
			nation(id: $n) { assignedDelegations { id } }
			committee(id: $k) { delegationMembers { id } }
		}`,
		{ n: E2E_UNRELEASED_NATION_ALPHA3, k: E2E_UNRELEASED_COMMITTEE_ID }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return result.data;
}

async function setReleased(page: Page, released: boolean) {
	const result = await gql(
		page,
		`mutation ($c: ID!, $r: Boolean!) { setAssignmentReleased(conferenceId: $c, released: $r) }`,
		{ c: E2E_UNRELEASED_CONFERENCE_ID, r: released }
	);
	expect(result.data?.setAssignmentReleased, JSON.stringify(result)).toBe(true);
}

test('a participant sees their role only while the assignment is released', async ({ browser }) => {
	const participant = await (await browser.newContext()).newPage();
	const admin = await (await browser.newContext()).newPage();
	await loginAs(participant, fixedTestUser(E2E_UNRELEASED_PARTICIPANT_USER_ID), {
		startUrl: `/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}`
	});
	await loginAs(admin, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}/management/assignment/finish`
	});

	try {
		await setReleased(admin, false);

		expect(await whatTheParticipantSees(participant)).toEqual({
			delegationMembers: [
				{
					assignedCommitteeId: null,
					assignedCommittee: null,
					delegation: { assignedNationAlpha3Code: null, assignedNation: null }
				}
			],
			nation: { assignedDelegations: [] },
			committee: { delegationMembers: [] }
		});

		// Neither accepted nor rejected: the dashboard says the assignment is still running.
		await participant.goto(`/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}`);
		await waitForHydration(participant);
		await expect(
			participant.getByText(/die zuteilung läuft noch|the assignment is still in progress/i)
		).toBeVisible();

		await setReleased(admin, true);

		const released = await whatTheParticipantSees(participant);
		expect(released?.delegationMembers).toEqual([
			{
				assignedCommitteeId: E2E_UNRELEASED_COMMITTEE_ID,
				assignedCommittee: { id: E2E_UNRELEASED_COMMITTEE_ID },
				delegation: {
					assignedNationAlpha3Code: E2E_UNRELEASED_NATION_ALPHA3,
					assignedNation: { alpha3Code: E2E_UNRELEASED_NATION_ALPHA3 }
				}
			}
		]);

		await setReleased(admin, false);
		const hiddenAgain = await whatTheParticipantSees(participant);
		expect(hiddenAgain?.delegationMembers).toEqual([
			{
				assignedCommitteeId: null,
				assignedCommittee: null,
				delegation: { assignedNationAlpha3Code: null, assignedNation: null }
			}
		]);
	} finally {
		await setReleased(admin, false);
	}
});

test('only the assignment team may release, and nobody else reads the draft', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_UNRELEASED_PARTICIPANT_USER_ID), {
		startUrl: `/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}`
	});

	const release = await gql(
		page,
		`mutation ($c: ID!) { setAssignmentReleased(conferenceId: $c, released: true) }`,
		{ c: E2E_UNRELEASED_CONFERENCE_ID }
	);
	expect(release.errors?.[0]?.message, JSON.stringify(release)).toMatch(/requires one of/);

	const draft = await gql(
		page,
		`query {
			assignmentUnits(where: { conferenceId: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" } }) { id }
			assignmentReviews(where: { conferenceId: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" } }) { id }
		}`
	);
	expect(draft.data, JSON.stringify(draft)).toEqual({ assignmentUnits: [], assignmentReviews: [] });
});

// Masking hides the values, but a filter on a masked column - or on a relation leading to it - is
// applied in SQL first: if a probe for the true role found rows while a probe for a wrong role did
// not, the participant would learn their role without ever reading it. The guard in
// `$api/services/assignmentFilterGuard` refuses such filters for everyone off the teams.
const conference = `conferenceId: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" }`;
const me = `userId: { eq: "${E2E_UNRELEASED_PARTICIPANT_USER_ID}" }`;

/** One probe per way of asking "does this delegation hold that role?". */
function probes(nation: string, committee: string) {
	return {
		byColumn: `delegations(where: { ${conference}, assignedNationAlpha3Code: { eq: "${nation}" } }) { id }`,
		byRelation: `delegations(where: { ${conference}, assignedNation: { alpha3Code: { eq: "${nation}" } } }) { id }`,
		byCommitteeColumn: `delegationMembers(where: { ${conference}, ${me}, assignedCommitteeId: { eq: "${committee}" } }) { id }`,
		byCommitteeRelation: `delegationMembers(where: { ${conference}, ${me}, assignedCommittee: { id: { eq: "${committee}" } } }) { id }`,
		nationOfMine: `nations(where: { alpha3Code: { eq: "${nation}" }, assignedDelegations: { members: { ${me} } } }) { alpha3Code }`,
		committeeOfMine: `committees(where: { id: { eq: "${committee}" }, delegationMembers: { ${me} } }) { id }`,
		sortedByNation: `delegations(where: { ${conference} }, orderBy: { assignedNationAlpha3Code: asc }) { id }`
	};
}

test('a participant cannot find their unreleased role by filtering or sorting', async ({
	browser
}) => {
	const participant = await (await browser.newContext()).newPage();
	await loginAs(participant, fixedTestUser(E2E_UNRELEASED_PARTICIPANT_USER_ID), {
		startUrl: `/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}`
	});

	for (const [name, probe] of Object.entries(
		probes(E2E_UNRELEASED_NATION_ALPHA3, E2E_UNRELEASED_COMMITTEE_ID)
	)) {
		const result = await gql(participant, `query { ${probe} }`);
		expect(result.errors?.[0]?.message, `${name}: ${JSON.stringify(result)}`).toMatch(
			/cannot be filtered or sorted/
		);
		expect(result.data ?? null, name).toBeNull();
	}

	// What a participant legitimately asks for is untouched.
	const own = await gql(
		participant,
		`query { delegationMembers(where: { ${conference}, ${me} }) { id } }`
	);
	expect(own.errors, JSON.stringify(own)).toBeUndefined();
	expect(own.data?.delegationMembers).toHaveLength(1);
});

test('the team can still filter by assignment', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}/management`
	});
	const { byColumn, byRelation } = probes(
		E2E_UNRELEASED_NATION_ALPHA3,
		E2E_UNRELEASED_COMMITTEE_ID
	);
	const wrong = probes('XXX', 'not-a-committee');

	const found = await gql(page, `query { found: ${byColumn} viaRelation: ${byRelation} }`);
	expect(found.errors, JSON.stringify(found)).toBeUndefined();
	expect(found.data).toEqual({
		found: [{ id: expect.any(String) }],
		viaRelation: [{ id: expect.any(String) }]
	});

	const missing = await gql(page, `query { missing: ${wrong.byColumn} }`);
	expect(missing.data).toEqual({ missing: [] });
});
