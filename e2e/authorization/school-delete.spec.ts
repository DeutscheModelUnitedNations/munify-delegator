import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser } from '../support/auth';
import { E2E_SCHOOL_CARE_ID, E2E_SHARED_SCHOOL_ID, E2E_TYPO_SCHOOL_ID } from '../seed/schools';

// Schools are shared by every conference, so participant care deletes one (`deleteSchool`, for a
// name typed wrongly) only while nobody outside its conferences names it.

type GraphQLResult = {
	data?: Record<string, unknown> | null;
	errors?: { message: string }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const DELETE = `mutation ($id: ID!) { deleteSchool(id: $id) }`;
const READ = `query ($id: ID!) { schools(where: { id: { eq: $id } }) { id } }`;

test('participant care deletes a school only its own conferences name', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_SCHOOL_CARE_ID));

	const shared = await gql(page, DELETE, { id: E2E_SHARED_SCHOOL_ID });
	expect(shared.errors?.[0]?.message, JSON.stringify(shared)).toMatch(/other conferences/i);
	expect((await gql(page, READ, { id: E2E_SHARED_SCHOOL_ID })).data?.schools).toHaveLength(1);

	const typo = await gql(page, DELETE, { id: E2E_TYPO_SCHOOL_ID });
	expect(typo.errors, JSON.stringify(typo)).toBeUndefined();
	expect((await gql(page, READ, { id: E2E_TYPO_SCHOOL_ID })).data?.schools).toEqual([]);
});

test('nobody outside the care team deletes a school', async ({ page }) => {
	await loginAs(page, makeTestUser('authz-school-deleter'));
	const result = await gql(page, DELETE, { id: E2E_SHARED_SCHOOL_ID });
	expect(result.errors?.[0]?.message, JSON.stringify(result)).toMatch(/not found/i);
});
