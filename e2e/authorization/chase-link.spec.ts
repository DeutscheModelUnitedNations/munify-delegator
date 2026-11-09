import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../support/test';
import {
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_UNRELEASED_CONFERENCE_ID
} from '../seed/seed';

// The linked CHASE reads through link read rules (`docs/plans/chase-link.md`): with a token for
// this API granting the `chase` role, it reaches the rows of mirrored conferences, only
// the listed columns, and participants only once the assignment is released; without one, or with
// any other, it reaches nothing more than anybody. The server links a CHASE that is never there
// (the LINK_* variables in playwright.config.ts); oidc-mock issues the tokens.

const ISSUER = 'http://127.0.0.1:8090/oidc';

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

/**
 * A client credentials token from oidc-mock, which issues one to any client, with whatever scope
 * it asks for: the `chase` scope is how Logto hands CHASE's M2M app the `chase` role.
 */
async function clientToken({
	request,
	resource,
	scope = 'chase'
}: {
	request: APIRequestContext;
	resource: string;
	scope?: string;
}) {
	const res = await request.post(`${ISSUER}/token`, {
		form: { grant_type: 'client_credentials', client_id: 'chase-e2e', resource, scope }
	});
	return String((await res.json()).access_token);
}

async function asChase({
	request,
	query,
	token
}: {
	request: APIRequestContext;
	query: string;
	token?: string | null;
}) {
	const linkToken =
		token === undefined
			? await clientToken({
					request,
					resource: new URL('/api', String(test.info().project.use.baseURL)).href
				})
			: token;
	const res = await request.post('/api/graphql', {
		headers: { 'x-locale': 'en', ...(linkToken ? { 'x-munify-link-token': linkToken } : {}) },
		data: { query }
	});
	return (await res.json()) as GraphQLResult;
}

const participantsOf = (conferenceId: string) => `{
	conferenceParticipants(where: { conference: { id: { eq: "${conferenceId}" } } }) { id userId }
	delegations(where: { conferenceId: { eq: "${conferenceId}" } }) { id assignedRoleId }
}`;

test('the linked CHASE reads a mirrored conference and its committees', async ({ request }) => {
	const result = await asChase({
		request,
		query: `{
			conference(id: "${E2E_PREP_CONFERENCE_ID}") { id title state }
			committees(where: { conferenceId: { eq: "${E2E_PREP_CONFERENCE_ID}" } }) { id name }
		}`
	});
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data?.conference).toMatchObject({ id: E2E_PREP_CONFERENCE_ID });
	expect(Array.isArray(result.data?.committees) && result.data.committees.length).toBeTruthy();
});

test('the linked CHASE reads participants only once the assignment is released', async ({
	request
}) => {
	const released = await asChase({ request, query: participantsOf(E2E_PREP_CONFERENCE_ID) });
	expect(released.errors, JSON.stringify(released)).toBeUndefined();
	expect(released.data?.conferenceParticipants).toEqual(
		expect.arrayContaining([expect.objectContaining({ userId: E2E_PREP_PARTICIPANT_USER_ID })])
	);

	const unreleased = await asChase({
		request,
		query: participantsOf(E2E_UNRELEASED_CONFERENCE_ID)
	});
	expect(unreleased.errors, JSON.stringify(unreleased)).toBeUndefined();
	expect(unreleased.data?.conferenceParticipants).toEqual([]);
	expect(unreleased.data?.delegations).toEqual([]);
});

test("the linked CHASE reads a participant's name and e-mail, nothing more", async ({
	request
}) => {
	const result = await asChase({
		request,
		query: `{ user(id: "${E2E_PREP_PARTICIPANT_USER_ID}") { id email givenName phone birthday } }`
	});
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data?.user).toMatchObject({
		id: E2E_PREP_PARTICIPANT_USER_ID,
		phone: null,
		birthday: null
	});
});

test('only a token for this API granting the chase role counts', async ({ request }) => {
	const baseURL = String(test.info().project.use.baseURL);
	const tokens = [
		null,
		'not-a-token',
		// a machine of the same provider without the role
		await clientToken({ request, resource: `${baseURL}/api`, scope: 'something-else' }),
		// the role, but on a token meant for another API
		await clientToken({ request, resource: 'https://other.e2e.invalid' })
	];
	for (const token of tokens) {
		const result = await asChase({ request, token, query: participantsOf(E2E_PREP_CONFERENCE_ID) });
		const participants = result.data?.conferenceParticipants;
		expect(participants ?? [], JSON.stringify(result)).toEqual([]);
	}
});

test('the link state names where CHASE is, nothing more', async ({ request }) => {
	const result = await asChase({ request, query: '{ instanceLinks { id remoteUrl lastError } }' });
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data?.instanceLinks).toEqual([
		expect.objectContaining({ remoteUrl: 'https://chase.e2e.invalid' })
	]);
});
