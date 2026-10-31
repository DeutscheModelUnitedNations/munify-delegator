import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ATTENDANCE_ADA_ID,
	E2E_ATTENDANCE_CARE_ID,
	E2E_ATTENDANCE_CONFERENCE_ID,
	E2E_ATTENDANCE_ENDED_SESSION
} from '../seed/attendance';

// The specs start, end and reopen sessions, so they run in order. The fixture
// (e2e/seed/attendance.ts) is reset on every run to the ended session "Eröffnung" with Ada's scan.
test.describe.configure({ mode: 'serial' });

// A running session shows the camera; a fake one answers instead of a permission prompt. Scans
// themselves go through the API: the scanner reads them off the camera.
test.use({
	permissions: ['camera'],
	launchOptions: {
		args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
	}
});

const SCANNER = `/dashboard/${E2E_ATTENDANCE_CONFERENCE_ID}/team/attendance`;
const ENDED = E2E_ATTENDANCE_ENDED_SESSION;
const TRIAL_RUN = 'Probelauf';

interface GraphQLResponse<T> {
	data?: T | null;
	errors?: { message: string; extensions?: { code?: string } }[];
}

async function graphql<T = unknown>(
	page: Page,
	query: string,
	variables: Record<string, unknown> = {}
): Promise<GraphQLResponse<T>> {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return await res.json();
}

interface StoredSession {
	id: string;
	occasion: string;
	endedAt: string | null;
	showOnCertificate: boolean;
	entryCount: number;
}

/** The conference's sessions as stored, by name */
async function sessions(page: Page) {
	const { data } = await graphql<{ attendanceSessions: StoredSession[] }>(
		page,
		`
			query ($c: ID!) {
				attendanceSessions(where: { conferenceId: { eq: $c } }) {
					id
					occasion
					endedAt
					showOnCertificate
					entryCount
				}
			}
		`,
		{ c: E2E_ATTENDANCE_CONFERENCE_ID }
	);
	return Object.fromEntries((data?.attendanceSessions ?? []).map((s) => [s.occasion, s]));
}

const sessionRow = (page: Page, name: string) =>
	page.locator('li').filter({ has: page.getByText(name, { exact: true }) });

async function openScanner(page: Page) {
	await loginAs(page, fixedTestUser(E2E_ATTENDANCE_CARE_ID), { startUrl: SCANNER });
	await expect(sessionRow(page, ENDED.occasion)).toBeVisible({ timeout: 15_000 });
}

async function startSession(page: Page, name: string) {
	await page.getByRole('button', { name: 'Neue Sitzung' }).click();
	await page.getByRole('textbox', { name: 'Sitzungsname' }).fill(name);
	await page.getByRole('button', { name: 'Sitzung starten' }).click();
}

test('lists an ended session with its scans and takes it off the certificates and back', async ({
	page
}) => {
	await openScanner(page);
	await expect(sessionRow(page, ENDED.occasion)).toContainText('1 Scans');

	const toggle = page.getByRole('checkbox', {
		name: `„${ENDED.occasion}“ auf dem Zertifikat zeigen`
	});
	await expect(toggle).toBeChecked();

	await toggle.uncheck();
	await expect
		.poll(async () => (await sessions(page))[ENDED.occasion]?.showOnCertificate)
		.toBe(false);

	await toggle.check();
	await expect
		.poll(async () => (await sessions(page))[ENDED.occasion]?.showOnCertificate)
		.toBe(true);
});

test('refuses to start a session under a name another session has, ignoring case', async ({
	page
}) => {
	await openScanner(page);
	await startSession(page, ENDED.occasion.toLowerCase());

	await expect(page.getByText(/Es gibt bereits eine Sitzung mit diesem Namen/)).toBeVisible({
		timeout: 15_000
	});
	// back on the form, with the name kept to change it
	await expect(page.getByRole('textbox', { name: 'Sitzungsname' })).toHaveValue(
		ENDED.occasion.toLowerCase()
	);
	expect(Object.keys(await sessions(page))).toEqual([ENDED.occasion]);
});

test('starts a session and ends it, after which it is listed to reopen', async ({ page }) => {
	await openScanner(page);
	await startSession(page, TRIAL_RUN);

	const end = page.getByRole('button', { name: 'Sitzung beenden' });
	await expect(end).toBeVisible({ timeout: 15_000 });
	await expect.poll(async () => (await sessions(page))[TRIAL_RUN]?.endedAt).toBeNull();

	await end.click();
	await expect.poll(async () => (await sessions(page))[TRIAL_RUN]?.endedAt).not.toBeNull();
	await expect(
		sessionRow(page, TRIAL_RUN).getByRole('button', { name: 'Wieder öffnen' })
	).toBeVisible({ timeout: 15_000 });
});

test('refuses renaming a session to a name another session has', async ({ page }) => {
	await openScanner(page);
	const trialRun = (await sessions(page))[TRIAL_RUN];
	expect(trialRun).toBeDefined();

	const { errors } = await graphql(
		page,
		`
			mutation ($id: ID!, $occasion: String!) {
				renameAttendanceSession(id: $id, occasion: $occasion)
			}
		`,
		{ id: trialRun.id, occasion: ENDED.occasion.toLowerCase() }
	);
	expect(errors?.[0]?.extensions?.code).toBe('CONFLICT');
	expect((await sessions(page))[TRIAL_RUN]?.occasion).toBe(TRIAL_RUN);
});

test('reopens an ended session, which keeps its scans', async ({ page }) => {
	await openScanner(page);
	await sessionRow(page, ENDED.occasion).getByRole('button', { name: 'Wieder öffnen' }).click();

	// reopening joins it on this device
	await expect(page.getByRole('button', { name: 'Sitzung beenden' })).toBeVisible({
		timeout: 15_000
	});
	await expect
		.poll(async () => {
			const session = (await sessions(page))[ENDED.occasion];
			return [session?.endedAt, session?.entryCount];
		})
		.toEqual([null, 1]);

	// the scan from before still counts: the person is not taken twice
	const { errors } = await graphql(
		page,
		`
			mutation ($userId: ID!, $conferenceId: ID!, $sessionId: ID!) {
				createAttendanceEntry(userId: $userId, conferenceId: $conferenceId, sessionId: $sessionId) {
					id
				}
			}
		`,
		{
			userId: E2E_ATTENDANCE_ADA_ID,
			conferenceId: E2E_ATTENDANCE_CONFERENCE_ID,
			sessionId: ENDED.id
		}
	);
	expect(errors?.[0]?.extensions?.code).toBe('ALREADY_SCANNED');
});

test('lists the people of a session, finds them by name and takes a scan back', async ({
	page
}) => {
	await openScanner(page);
	const row = sessionRow(page, ENDED.occasion);
	await row.getByRole('button', { name: 'Personen anzeigen' }).click();

	const search = row.getByRole('searchbox', { name: 'Suche' });
	await expect(row.getByText('Ada Lovelace')).toBeVisible({ timeout: 15_000 });

	await search.fill('lovelace ada');
	await expect(row.getByText('Ada Lovelace')).toBeVisible();
	await search.fill('Babbage');
	await expect(row.getByText('Niemand in dieser Sitzung passt zur Suche.')).toBeVisible({
		timeout: 15_000
	});

	await search.fill('');
	await row.getByRole('button', { name: 'Scan von Ada Lovelace entfernen' }).click();
	await page.getByRole('alertdialog').getByRole('button', { name: 'Löschen' }).click();
	await expect(row.getByText('In dieser Sitzung wurde noch niemand gescannt.')).toBeVisible({
		timeout: 15_000
	});
	await expect.poll(async () => (await sessions(page))[ENDED.occasion]?.entryCount).toBe(0);

	// taken back, the person can be scanned in the session again
	const { errors } = await graphql(
		page,
		`
			mutation ($userId: ID!, $conferenceId: ID!, $sessionId: ID!) {
				createAttendanceEntry(userId: $userId, conferenceId: $conferenceId, sessionId: $sessionId) {
					id
				}
			}
		`,
		{
			userId: E2E_ATTENDANCE_ADA_ID,
			conferenceId: E2E_ATTENDANCE_CONFERENCE_ID,
			sessionId: ENDED.id
		}
	);
	expect(errors).toBeUndefined();
});
