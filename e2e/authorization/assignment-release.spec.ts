import { test, expect, type Page } from '../support/test';
import pg from 'pg';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_UNRELEASED_COMMITTEE_ID,
	E2E_UNRELEASED_CONFERENCE_ID,
	E2E_UNRELEASED_NATION_ALPHA3,
	E2E_UNRELEASED_PARTICIPANT_USER_ID
} from '../seed/seed';
import { nationRoleId } from '../support/roles';

const roleIdAs = (page: Page) =>
	nationRoleId(page, E2E_UNRELEASED_CONFERENCE_ID, E2E_UNRELEASED_NATION_ALPHA3);

// Until the assignment is released, a participant must not learn their role through any path the
// API offers: the masked columns, the relations they back, and the relations pointing back from
// the role and the committee. Setting the flag then shows it, and clearing it hides it again. No
// mutation sets it, so the test writes it straight into the database.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

/** Everything a participant could ask to find out their nation and committee. */
async function whatTheParticipantSees(page: Page) {
	const result = await gql(
		page,
		`query ($r: ID!, $k: ID!) {
			delegationMembers(where: { conference: { id: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" } }, user: { id: { eq: "${E2E_UNRELEASED_PARTICIPANT_USER_ID}" } } }) {
				assignedCommitteeId
				assignedCommittee { id }
				delegation { assignedRoleId assignedRole { nationAlpha3Code } }
			}
			conferenceRole(id: $r) { assignedDelegations { id } }
			committee(id: $k) { delegationMembers { id } }
		}`,
		{ r: await roleIdAs(page), k: E2E_UNRELEASED_COMMITTEE_ID }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return result.data;
}

async function setReleased(released: boolean) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		await client.query(
			'UPDATE conference SET assignment_released = $2, assignment_released_at = CASE WHEN $2 THEN now() END WHERE id = $1',
			[E2E_UNRELEASED_CONFERENCE_ID, released]
		);
	} finally {
		await client.end();
	}
}

test('a participant sees their role only while the assignment is released', async ({ browser }) => {
	const participant = await (await browser.newContext()).newPage();
	await loginAs(participant, fixedTestUser(E2E_UNRELEASED_PARTICIPANT_USER_ID));

	try {
		await setReleased(false);

		expect(await whatTheParticipantSees(participant)).toEqual({
			delegationMembers: [
				{
					assignedCommitteeId: null,
					assignedCommittee: null,
					delegation: { assignedRoleId: null, assignedRole: null }
				}
			],
			conferenceRole: { assignedDelegations: [] },
			committee: { delegationMembers: [] }
		});

		// Neither accepted nor rejected: the dashboard says the assignment is still running.
		await participant.goto(`/dashboard/${E2E_UNRELEASED_CONFERENCE_ID}`);
		await waitForHydration(participant);
		await expect(
			participant.getByText(/die zuteilung läuft noch|the assignment is still in progress/i)
		).toBeVisible();

		await setReleased(true);

		const released = await whatTheParticipantSees(participant);
		expect(released?.delegationMembers).toEqual([
			{
				assignedCommitteeId: E2E_UNRELEASED_COMMITTEE_ID,
				assignedCommittee: { id: E2E_UNRELEASED_COMMITTEE_ID },
				delegation: {
					assignedRoleId: await roleIdAs(participant),
					assignedRole: { nationAlpha3Code: E2E_UNRELEASED_NATION_ALPHA3 }
				}
			}
		]);

		await setReleased(false);
		const hiddenAgain = await whatTheParticipantSees(participant);
		expect(hiddenAgain?.delegationMembers).toEqual([
			{
				assignedCommitteeId: null,
				assignedCommittee: null,
				delegation: { assignedRoleId: null, assignedRole: null }
			}
		]);
	} finally {
		await setReleased(false);
	}
});

test('a participant does not read the assignment draft', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_UNRELEASED_PARTICIPANT_USER_ID));

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
// not, the participant would learn their role without ever reading it. Rumble therefore applies the
// column masks to filter arguments too: a filter only matches rows exposing the column.
const conference = `conferenceId: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" }`;
const me = `user: { id: { eq: "${E2E_UNRELEASED_PARTICIPANT_USER_ID}" } }`;
// delegation members reach their conference through the participant row
const memberConference = `conference: { id: { eq: "${E2E_UNRELEASED_CONFERENCE_ID}" } }`;

/** One probe per way of asking "does this delegation hold that role?". */
function probes(roleId: string, nation: string, committee: string) {
	return {
		byColumn: `delegations(where: { ${conference}, assignedRoleId: { eq: "${roleId}" } }) { id }`,
		byRelation: `delegations(where: { ${conference}, assignedRole: { nationAlpha3Code: { eq: "${nation}" } } }) { id }`,
		byCommitteeColumn: `delegationMembers(where: { ${memberConference}, ${me}, assignedCommitteeId: { eq: "${committee}" } }) { id }`,
		byCommitteeRelation: `delegationMembers(where: { ${memberConference}, ${me}, assignedCommittee: { id: { eq: "${committee}" } } }) { id }`,
		roleOfMine: `conferenceRoles(where: { nationAlpha3Code: { eq: "${nation}" }, assignedDelegations: { members: { ${me} } } }) { id }`,
		committeeOfMine: `committees(where: { id: { eq: "${committee}" }, delegationMembers: { ${me} } }) { id }`,
		sortedByRole: `delegations(where: { ${conference}, assignedRoleId: { isNotNull: true } }, orderBy: { assignedRoleId: asc }) { id }`
	};
}

test('a participant cannot find their unreleased role by filtering or sorting', async ({
	browser
}) => {
	const participant = await (await browser.newContext()).newPage();
	await loginAs(participant, fixedTestUser(E2E_UNRELEASED_PARTICIPANT_USER_ID));

	for (const [name, probe] of Object.entries(
		probes(await roleIdAs(participant), E2E_UNRELEASED_NATION_ALPHA3, E2E_UNRELEASED_COMMITTEE_ID)
	)) {
		const result = await gql(participant, `query { ${probe} }`);
		expect(result.errors, `${name}: ${JSON.stringify(result)}`).toBeUndefined();
		// A filter on a masked column matches nothing, whether the role it names is right or not.
		expect(Object.values(result.data ?? {})[0], name).toEqual([]);
	}

	// What a participant legitimately asks for is untouched.
	const own = await gql(
		participant,
		`query { delegationMembers(where: { ${memberConference}, ${me} }) { id } }`
	);
	expect(own.errors, JSON.stringify(own)).toBeUndefined();
	expect(own.data?.delegationMembers).toHaveLength(1);
});

test('the team can still filter by assignment', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));
	const { byColumn, byRelation } = probes(
		await roleIdAs(page),
		E2E_UNRELEASED_NATION_ALPHA3,
		E2E_UNRELEASED_COMMITTEE_ID
	);
	const wrong = probes('not-a-role', 'XXX', 'not-a-committee');

	const found = await gql(page, `query { found: ${byColumn} viaRelation: ${byRelation} }`);
	expect(found.errors, JSON.stringify(found)).toBeUndefined();
	expect(found.data).toEqual({
		found: [{ id: expect.any(String) }],
		viaRelation: [{ id: expect.any(String) }]
	});

	const missing = await gql(page, `query { missing: ${wrong.byColumn} }`);
	expect(missing.data).toEqual({ missing: [] });
});
