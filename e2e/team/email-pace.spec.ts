import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_EMAIL_PACE_CARE_ID, E2E_EMAIL_PACE_CONFERENCE_ID } from '../seed/emailPace';

// Participant care limits how many mails per second the conference's sweeps send, on the e-mail
// tab of the settings; the value waits for the save button like the switches next to it.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

async function storedPace(page: Page) {
	const result = await gql(page, `query ($id: ID!) { conference(id: $id) { emailsPerSecond } }`, {
		id: E2E_EMAIL_PACE_CONFERENCE_ID
	});
	const conference = result.data?.conference as { emailsPerSecond: number | null } | undefined;
	return conference?.emailsPerSecond;
}

const SET_PACE = `mutation ($c: ID!, $n: Int) {
	setConferenceEmailsPerSecond(conferenceId: $c, emailsPerSecond: $n)
}`;

test('participant care sets and lifts the sending pace', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_EMAIL_PACE_CARE_ID), {
		startUrl: `/dashboard/${E2E_EMAIL_PACE_CONFERENCE_ID}/team/configuration?tab=emails`
	});

	const field = page.getByRole('spinbutton', {
		name: /E-Mails pro Sekunde|Emails per second/i
	});
	await expect(field).toBeVisible({ timeout: 15_000 });
	await expect(field).toHaveValue('');

	// out of range: an error, and nothing to save
	await field.fill('0');
	await expect(page.getByRole('alert').filter({ hasText: /1000/ })).toBeVisible();

	await field.fill('5');
	await expect(page.getByRole('alert').filter({ hasText: /1000/ })).toHaveCount(0);
	await page
		.getByRole('button', { name: /einstellungen speichern|save settings/i })
		.last()
		.click();
	const dialog = page.locator('.modal-open, dialog[open]').first();
	await expect(dialog.getByText(/Versandgeschwindigkeit|Sending speed/)).toBeVisible();
	await dialog.getByRole('button', { name: /^(speichern|save)$/i }).click();
	await expect.poll(() => storedPace(page)).toBe(5);

	// emptied, the limit is lifted
	await field.fill('');
	await page
		.getByRole('button', { name: /einstellungen speichern|save settings/i })
		.last()
		.click();
	await dialog.getByRole('button', { name: /^(speichern|save)$/i }).click();
	await expect.poll(() => storedPace(page)).toBeNull();
});

test('the API refuses a pace out of range', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_EMAIL_PACE_CARE_ID));
	for (const n of [0, 1001]) {
		const result = await gql(page, SET_PACE, { c: E2E_EMAIL_PACE_CONFERENCE_ID, n });
		expect(result.errors?.length).toBeGreaterThan(0);
	}
	expect(await storedPace(page)).toBeNull();
});
