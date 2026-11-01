import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_CONFERENCE_ID,
	E2E_PREFS_NATION_ALPHA3S,
	E2E_WISHES_DELEGATION_ID
} from '../seed/seed';

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

// Each wish goes to the end of the delegation's ranking. Wishes added at the same time used to
// count the same wishes and take the same rank, so all but one were refused by the database.
test('wishes added at the same time each get a rank of their own', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));

	const wish = async (alpha3: string) => {
		const res = await page.request.post('/api/graphql', {
			data: {
				query: `mutation ($d: ID!, $r: ID!) { createRoleApplication(delegationId: $d, roleId: $r) { rank } }`,
				variables: {
					d: E2E_WISHES_DELEGATION_ID,
					r: `e2e-nation-${E2E_CONFERENCE_ID}-${alpha3}`
				}
			}
		});
		return (await res.json()) as GraphQLResult;
	};

	const results = await Promise.all(E2E_PREFS_NATION_ALPHA3S.map(wish));
	for (const result of results) expect(result.errors, JSON.stringify(result)).toBeUndefined();

	const ranks = results.map(
		(result) => (result.data?.createRoleApplication as { rank: number } | undefined)?.rank
	);
	expect(ranks.toSorted()).toEqual([1, 2, 3]);
});
