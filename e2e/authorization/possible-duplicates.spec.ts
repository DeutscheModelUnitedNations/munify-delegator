import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_DUPLICATE_EARLIER_NOTE,
	E2E_DUPLICATE_EARLIER_USER_ID,
	E2E_MGMT_ADMIN_ID,
	E2E_MGMT_TARGET_USER_ID,
	E2E_POSSIBLE_DUPLICATE_ID,
	E2E_TEAM_COORDINATOR_ID
} from '../seed/seed';

// A possible duplicate lets participant care read an account outside their conferences: its name
// and its care note, the reason the pair is shown - not its contact details, not for anybody else
// on the team. Once the pair is dismissed the note is withheld again, the name stays.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return (await res.json()) as GraphQLResult;
}

/** The earlier account as the caller may read it: `undefined` when not at all. */
async function earlierAccount(page: Page) {
	const result = await gql(
		page,
		`query {
			users(where: { id: { eq: "${E2E_DUPLICATE_EARLIER_USER_ID}" } }) {
				id familyName globalNotes phone street
			}
		}`
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	const users = result.data?.users;
	return Array.isArray(users) ? users[0] : undefined;
}

async function decide(page: Page, status: 'OPEN' | 'DISMISSED' | 'CONFIRMED') {
	const result = await gql(
		page,
		`mutation ($id: ID!, $s: PossibleduplicatestatusEnum!) {
			decidePossibleDuplicate(id: $id, status: $s) { status }
		}`,
		{ id: E2E_POSSIBLE_DUPLICATE_ID, s: status }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
}

test('participant care reads the other account’s name and note, not its contact details', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), { startUrl: '/login?next=/dashboard' });

	const pairs = await gql(
		page,
		`query { possibleDuplicates { id user { id globalNotes } candidate { id } } }`
	);
	expect(pairs.errors, JSON.stringify(pairs)).toBeUndefined();
	expect(JSON.stringify(pairs.data)).toContain(E2E_DUPLICATE_EARLIER_NOTE);

	const account = await earlierAccount(page);
	expect(account).toMatchObject({
		globalNotes: E2E_DUPLICATE_EARLIER_NOTE,
		phone: null,
		street: null
	});
});

test('a dismissed pair keeps the name, loses the note, and can be reopened', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), { startUrl: '/login?next=/dashboard' });

	await decide(page, 'DISMISSED');
	try {
		expect(await earlierAccount(page)).toMatchObject({ globalNotes: null, phone: null });

		// still listed, so the dismissal can be undone
		const pairs = await gql(
			page,
			`query { possibleDuplicates { id status candidate { id } user { id familyName } } }`
		);
		expect(pairs.errors, JSON.stringify(pairs)).toBeUndefined();
		expect(JSON.stringify(pairs.data)).toContain('DISMISSED');
	} finally {
		await decide(page, 'OPEN');
	}
	expect(await earlierAccount(page)).toMatchObject({ globalNotes: E2E_DUPLICATE_EARLIER_NOTE });
});

test('a confirmed pair carries the old account’s note over to the new one', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), { startUrl: '/login?next=/dashboard' });

	const linkedNotes = async () => {
		const result = await gql(
			page,
			`query {
				users(where: { id: { eq: "${E2E_MGMT_TARGET_USER_ID}" } }) {
					duplicatesAsCandidate(where: { status: CONFIRMED }) { user { globalNotes } }
				}
			}`
		);
		expect(result.errors, JSON.stringify(result)).toBeUndefined();
		return JSON.stringify(result.data);
	};

	// an open pair is a suspicion, not yet a fact: nothing is carried over
	expect(await linkedNotes()).not.toContain(E2E_DUPLICATE_EARLIER_NOTE);
	await decide(page, 'CONFIRMED');
	try {
		expect(await linkedNotes()).toContain(E2E_DUPLICATE_EARLIER_NOTE);
	} finally {
		await decide(page, 'OPEN');
	}
	expect(await linkedNotes()).not.toContain(E2E_DUPLICATE_EARLIER_NOTE);
});

test('the rest of the team sees neither the pairs nor the other account', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_TEAM_COORDINATOR_ID), {
		startUrl: '/login?next=/dashboard'
	});

	const pairs = await gql(page, `query { possibleDuplicates { id } }`);
	expect(pairs.data?.possibleDuplicates, JSON.stringify(pairs)).toEqual([]);
	expect(await earlierAccount(page)).toBeUndefined();

	const decision = await gql(
		page,
		`mutation ($id: ID!) { decidePossibleDuplicate(id: $id, status: DISMISSED) { id } }`,
		{ id: E2E_POSSIBLE_DUPLICATE_ID }
	);
	expect(decision.errors?.[0]?.message, JSON.stringify(decision)).toMatch(/not found/);
});
