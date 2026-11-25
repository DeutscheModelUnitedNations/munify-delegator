import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ATTENDANCE_ADA_ID,
	E2E_ATTENDANCE_CARE_ID,
	E2E_ATTENDANCE_CONFERENCE_ID
} from '../seed/attendance';

// The entrance check is the server's: the scanner shows what the lookup finds open, and a recorded
// scan stores the verdict the server reaches, never one the scanner sends. Ada's payment and terms
// are pending in the attendance seed, so her check never passes.

type GraphQLResult = {
	data?: Record<string, Record<string, unknown> | null> | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const conferenceId = E2E_ATTENDANCE_CONFERENCE_ID;

async function startSession(page: Page, mode: 'CHECK' | 'RECORD' | 'BADGE') {
	const id = crypto.randomUUID();
	const result = await gql(
		page,
		`mutation ($id: ID!, $c: ID!, $o: String!, $mode: AttendancesessionmodeEnum!) {
			startAttendanceSession(id: $id, conferenceId: $c, occasion: $o, mode: $mode) { id }
		}`,
		{ id, c: conferenceId, o: `Check ${id.slice(0, 8)}`, mode }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return id;
}

const lookup = (page: Page, sessionId: string) =>
	gql(
		page,
		`query ($c: ID!, $code: String!, $s: ID) {
			scanLookup(conferenceId: $c, code: $code, sessionId: $s, asScan: true) {
				issues checkPassed mayRecordAnyway
			}
		}`,
		{ c: conferenceId, code: E2E_ATTENDANCE_ADA_ID, s: sessionId }
	);

const record = (page: Page, sessionId: string) =>
	gql(
		page,
		`mutation ($u: ID!, $c: ID!, $s: ID!) {
			createAttendanceEntry(userId: $u, conferenceId: $c, sessionId: $s) { checkPassed }
		}`,
		{ u: E2E_ATTENDANCE_ADA_ID, c: conferenceId, s: sessionId }
	);

/** Records Ada's scan, handing her the card. */
const recordCard = (page: Page, sessionId: string, accessCardId: string) =>
	gql(
		page,
		`mutation ($u: ID!, $c: ID!, $s: ID!, $card: String!) {
			createAttendanceEntry(userId: $u, conferenceId: $c, sessionId: $s, accessCardId: $card) {
				id checkPassed
			}
		}`,
		{ u: E2E_ATTENDANCE_ADA_ID, c: conferenceId, s: sessionId, card: accessCardId }
	);

/** The card Ada carries, as a session's lookup tells it. */
async function adasCard(page: Page, sessionId: string) {
	const result = await gql(
		page,
		`query ($c: ID!, $code: String!, $s: ID) {
			scanLookup(conferenceId: $c, code: $code, sessionId: $s) { accessCardId }
		}`,
		{ c: conferenceId, code: E2E_ATTENDANCE_ADA_ID, s: sessionId }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return result.data?.scanLookup?.accessCardId;
}

test.beforeEach(async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ATTENDANCE_CARE_ID));
});

test('a checking session stores the verdict the server reaches', async ({ page }) => {
	const sessionId = await startSession(page, 'CHECK');

	const first = await lookup(page, sessionId);
	expect(first.data?.scanLookup).toMatchObject({
		issues: ['paymentOpen', 'termsOpen'],
		checkPassed: false,
		mayRecordAnyway: true
	});

	const recorded = await record(page, sessionId);
	expect(recorded.data?.createAttendanceEntry).toEqual({ checkPassed: false });

	// Scanned again, the earlier scan is open too, and that one cannot be overridden
	const again = await lookup(page, sessionId);
	expect(again.data?.scanLookup).toMatchObject({
		issues: ['paymentOpen', 'termsOpen', 'alreadyScanned'],
		checkPassed: false,
		mayRecordAnyway: false
	});
});

test('a session that only records checks nothing', async ({ page }) => {
	const sessionId = await startSession(page, 'RECORD');
	const recorded = await record(page, sessionId);
	expect(recorded.data?.createAttendanceEntry).toEqual({ checkPassed: null });
});

test('the scanner cannot hand in a verdict of its own', async ({ page }) => {
	const sessionId = await startSession(page, 'CHECK');
	const result = await gql(
		page,
		`mutation ($u: ID!, $c: ID!, $s: ID!) {
			createAttendanceEntry(userId: $u, conferenceId: $c, sessionId: $s, checkPassed: true) { id }
		}`,
		{ u: E2E_ATTENDANCE_ADA_ID, c: conferenceId, s: sessionId }
	);
	expect(result.errors?.[0]?.message).toMatch(/checkPassed/);
});

test('a badge session stores the card with the scan, and a second scan replaces it', async ({
	page
}) => {
	const sessionId = await startSession(page, 'BADGE');
	const card = `CARD-${sessionId.slice(0, 8)}`;

	const first = await recordCard(page, sessionId, ` ${card} `);
	expect(first.data?.createAttendanceEntry).toMatchObject({ checkPassed: false });
	expect(await adasCard(page, sessionId)).toBe(card);

	const again = await recordCard(page, sessionId, `${card}-2`);
	expect(again.data?.createAttendanceEntry?.id).toBe(first.data?.createAttendanceEntry?.id);
	expect(await adasCard(page, sessionId)).toBe(`${card}-2`);

	// told only where cards are handed out
	expect(await adasCard(page, await startSession(page, 'CHECK'))).toBeNull();
});

test('a badge session takes no scan without a card, and no other session takes one', async ({
	page
}) => {
	const badge = await startSession(page, 'BADGE');
	const without = await record(page, badge);
	expect(without.errors?.[0]?.extensions?.code, JSON.stringify(without)).toBe('INVALID_INPUT');
	const blank = await recordCard(page, badge, '  ');
	expect(blank.errors?.[0]?.extensions?.code, JSON.stringify(blank)).toBe('INVALID_INPUT');

	for (const mode of ['CHECK', 'RECORD'] as const) {
		const result = await recordCard(page, await startSession(page, mode), 'CARD');
		expect(result.errors?.[0]?.extensions?.code, JSON.stringify(result)).toBe('INVALID_INPUT');
	}
});

test('an ended badge session hands out no more cards', async ({ page }) => {
	const sessionId = await startSession(page, 'BADGE');
	const card = `CARD-${sessionId.slice(0, 8)}`;
	const stored = await recordCard(page, sessionId, card);
	expect(stored.errors, JSON.stringify(stored)).toBeUndefined();

	const ended = await gql(page, `mutation ($id: ID!) { endAttendanceSession(id: $id) }`, {
		id: sessionId
	});
	expect(ended.errors, JSON.stringify(ended)).toBeUndefined();

	const late = await recordCard(page, sessionId, `${card}-2`);
	expect(late.errors?.[0]?.extensions?.code, JSON.stringify(late)).toBe('CONFLICT');
	expect(await adasCard(page, sessionId)).toBeNull();
	// the card from before stays hers
	expect(await adasCard(page, await startSession(page, 'BADGE'))).toBe(card);
});
