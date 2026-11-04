import { createHash } from 'node:crypto';
import pg from 'pg';
import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../support/test';
import {
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_UNRELEASED_CONFERENCE_ID
} from '../seed/seed';

// The linked CHASE reads through link read rules (`docs/plans/chase-link.md`): with its token it
// reaches the rows of mirrored conferences, only the listed columns, and participants only once
// the assignment is released; without the token, or with another one, it reaches nothing more
// than anybody. The link row is written straight into the database: pairing needs a CHASE to
// call back.
//
// While this file runs, an ACTIVE link exists, which shows the CHASE hints on other pages too;
// the spec only reads, and removes the link again.

const TOKEN = 'e2e-chase-link-token-0000000000000000000000000000';

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function asChase({
	request,
	query,
	token = TOKEN
}: {
	request: APIRequestContext;
	query: string;
	token?: string | null;
}) {
	const res = await request.post('/api/graphql', {
		headers: { 'x-locale': 'en', ...(token ? { 'x-munify-link-token': token } : {}) },
		data: { query }
	});
	return (await res.json()) as GraphQLResult;
}

async function withDatabase(run: (client: pg.Client) => Promise<unknown>) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		await run(client);
	} finally {
		await client.end();
	}
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
	await withDatabase(async (client) => {
		await client.query('DELETE FROM instance_link');
		await client.query(
			`INSERT INTO instance_link (id, remote_url, status, inbound_token_hash, linked_at)
			 VALUES ('e2e-chase-link', 'https://chase.e2e.invalid', 'ACTIVE', $1, now())`,
			[createHash('sha256').update(TOKEN).digest('hex')]
		);
	});
});

test.afterAll(async () => {
	await withDatabase((client) =>
		client.query("DELETE FROM instance_link WHERE id = 'e2e-chase-link'")
	);
});

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

test('the link token is the only way in: none or another reaches nothing', async ({ request }) => {
	for (const token of [null, 'not-the-token']) {
		const result = await asChase({ request, token, query: participantsOf(E2E_PREP_CONFERENCE_ID) });
		const participants = result.data?.conferenceParticipants;
		expect(participants ?? [], JSON.stringify(result)).toEqual([]);
	}
});

test('the linked CHASE never reads the link tokens', async ({ request }) => {
	const result = await asChase({
		request,
		query: '{ instanceLinks { id remoteUrl status } }'
	});
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	const withTokens = await asChase({ request, query: '{ instanceLinks { inboundTokenHash } }' });
	expect(withTokens.errors ?? [], JSON.stringify(withTokens)).not.toEqual([]);
});
