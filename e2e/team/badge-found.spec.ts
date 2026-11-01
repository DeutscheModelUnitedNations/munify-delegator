import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ATTENDANCE_ADA_ID,
	E2E_ATTENDANCE_CARE_ID,
	E2E_ATTENDANCE_CONFERENCE_ID
} from '../seed/attendance';

// Participant care tells someone their lost badge was handed in, with the button next to the
// access card number in the user card. Nothing is stored but the mail's log row, sent by hand;
// whether the SMTP server takes it does not matter here, the row is written either way.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const conferenceId = E2E_ATTENDANCE_CONFERENCE_ID;

/** How many found badge mails Ada was sent, as participant care reads the log. */
async function badgeMailsToAda(page: Page) {
	const result = await gql(
		page,
		`query ($c: ID!, $u: ID!) {
			emailLogs(where: { conferenceId: { eq: $c }, userId: { eq: $u } }) { kind trigger }
		}`,
		{ c: conferenceId, u: E2E_ATTENDANCE_ADA_ID }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	const rows = (result.data?.emailLogs ?? []) as { kind: string; trigger: string }[];
	return rows.filter((row) => row.kind === 'BADGE_FOUND' && row.trigger === 'MANUAL').length;
}

async function adaParticipantId(page: Page) {
	const result = await gql(
		page,
		`query ($c: ID!, $u: ID!) {
			conferenceParticipants(where: { conferenceId: { eq: $c }, userId: { eq: $u } }) { id }
		}`,
		{ c: conferenceId, u: E2E_ATTENDANCE_ADA_ID }
	);
	const rows = (result.data?.conferenceParticipants ?? []) as { id: string }[];
	expect(rows.length, JSON.stringify(result)).toBe(1);
	return rows[0].id;
}

test('participant care notifies someone of their found badge from the user card', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_ATTENDANCE_CARE_ID), {
		// A filter that narrows the table to one row opens that row's user card by itself.
		startUrl: `/dashboard/${conferenceId}/team/participants?search=Lovelace`
	});
	const before = await badgeMailsToAda(page);

	const accessTab = page.getByRole('tab', { name: /zugang|access/i });
	await expect(accessTab).toBeVisible({ timeout: 15_000 });
	await accessTab.click();

	const notify = page.getByRole('button', { name: /ausweis gefunden|badge found/i });
	await expect(notify).toBeVisible({ timeout: 15_000 });
	await notify.click();

	await expect.poll(() => badgeMailsToAda(page), { timeout: 15_000 }).toBe(before + 1);
	// Every press sends it once more
	await expect(notify).toBeEnabled({ timeout: 15_000 });
	await notify.click();
	await expect.poll(() => badgeMailsToAda(page), { timeout: 15_000 }).toBe(before + 2);
});

test('only participant care can send it', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ATTENDANCE_CARE_ID));
	const id = await adaParticipantId(page);

	await loginAs(page, fixedTestUser(E2E_ATTENDANCE_ADA_ID));
	const own = await gql(page, `mutation ($id: ID!) { notifyBadgeFound(id: $id) { sent } }`, {
		id
	});
	expect(own.data?.notifyBadgeFound ?? null).toBeNull();
	expect(own.errors?.length ?? 0, JSON.stringify(own)).toBeGreaterThan(0);
});
