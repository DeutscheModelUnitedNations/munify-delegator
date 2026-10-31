import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_CONFERENCE_ID,
	E2E_MGMT_ADMIN_ID,
	E2E_MGMT_TARGET_FAMILY_NAME,
	E2E_MGMT_TARGET_USER_ID,
	E2E_PAPER_REVIEWER_ID
} from '../seed/seed';

// Participant care sends a person a mail they are owed by hand, from the user card. The seeded
// management target holds a released seat, so they are owed their acceptance whether or not the
// conference sends it on its own. Whether the SMTP server takes it does not matter here: the send
// is logged as sent by hand either way.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const PERSON_EMAILS = `query ($c: ID!, $u: ID!) {
	personEmails(conferenceId: $c, userId: $u) { kind subjectKey lastStatus }
}`;

test('participant care sends a person an owed mail by hand from the user card', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/participants?search=${E2E_MGMT_TARGET_FAMILY_NAME}`
	});

	const statusTab = page.getByRole('tab', { name: /status/i });
	await expect(statusTab).toBeVisible({ timeout: 15_000 });
	await statusTab.click();

	const owed = page.locator(
		'section:has(h3:text-matches("E-Mails zum Verschicken|Emails to send"))'
	);
	await expect(owed).toBeVisible({ timeout: 15_000 });
	const before = await page
		.locator('table')
		.getByText(/von Hand|by hand/i)
		.count();

	await owed
		.getByRole('button', { name: /^(verschicken|send|erneut verschicken|send again)$/i })
		.first()
		.click();
	const dialog = page.locator('.modal-open, dialog[open]').first();
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: /^(verschicken|send)$/i }).click();

	// The log below lists the send, marked as by hand
	await expect
		.poll(
			() =>
				page
					.locator('table')
					.getByText(/von Hand|by hand/i)
					.count(),
			{ timeout: 15_000 }
		)
		.toBeGreaterThan(before);
});

test('the API sends only what the person is owed, and only for participant care', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID));
	const listed = await gql(page, PERSON_EMAILS, {
		c: E2E_CONFERENCE_ID,
		u: E2E_MGMT_TARGET_USER_ID
	});
	const emails = (listed.data?.personEmails ?? []) as { kind: string; subjectKey: string }[];
	expect(emails.map((email) => email.kind)).toContain('ASSIGNMENT_ACCEPTED');

	const notOwed = await gql(
		page,
		`mutation ($c: ID!, $u: ID!) {
			sendPersonEmail(conferenceId: $c, userId: $u, kind: CERTIFICATE_AVAILABLE, subjectKey: "certificate") { sent }
		}`,
		{ c: E2E_CONFERENCE_ID, u: E2E_MGMT_TARGET_USER_ID }
	);
	expect(notOwed.errors?.[0]?.message, JSON.stringify(notOwed)).toMatch(/not owed/);

	await loginAs(page, fixedTestUser(E2E_PAPER_REVIEWER_ID));
	const reviewer = await gql(page, PERSON_EMAILS, {
		c: E2E_CONFERENCE_ID,
		u: E2E_MGMT_TARGET_USER_ID
	});
	expect(reviewer.data?.personEmails ?? null).toBeNull();
	expect(reviewer.errors?.length ?? 0).toBeGreaterThan(0);
});
