import { test, expect, type Page } from '../support/test';
import { loginAs, makeTestUser } from '../support/auth';
import { E2E_LATE_SUPERVISOR_CONFERENCE_ID, E2E_OVER_CONFERENCE_ID } from '../seed/lateSupervisor';

// Supervisors send no application and take no seat, so the registration window does not bind them:
// they sign themselves up at any point until the conference is over. The supervisor page stays
// open after registration closed, and the API has to keep that promise.

type GraphQLResult = {
	data?: { createConferenceSupervisor?: { id: string } | null } | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function signUpAsSupervisor(page: Page, conferenceId: string) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: {
			query: `mutation ($c: ID!) { createConferenceSupervisor(conferenceId: $c) { id } }`,
			variables: { c: conferenceId }
		}
	});
	return (await res.json()) as GraphQLResult;
}

test('a supervisor signs up after registration has closed', async ({ page }) => {
	await loginAs(page, makeTestUser('late-supervisor'));
	const result = await signUpAsSupervisor(page, E2E_LATE_SUPERVISOR_CONFERENCE_ID);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data?.createConferenceSupervisor?.id).toBeTruthy();
});

test('nobody signs up as supervisor once the conference is over', async ({ page }) => {
	await loginAs(page, makeTestUser('over-supervisor'));
	const result = await signUpAsSupervisor(page, E2E_OVER_CONFERENCE_ID);
	expect(result.errors?.[0]?.extensions?.code, JSON.stringify(result)).toBe('CONFLICT');
	expect(result.errors?.[0]?.message).toMatch(/conference is over/);
	expect(result.data?.createConferenceSupervisor ?? null).toBeNull();
});
