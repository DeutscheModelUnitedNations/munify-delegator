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
	errors?: { message: string }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const conferenceId = E2E_ATTENDANCE_CONFERENCE_ID;

async function startSession(page: Page, mode: 'CHECK' | 'RECORD') {
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
