import { test, expect, type Page } from '../support/test';
import { loginAs, makeTestUser, SUPERVISOR_AGE } from '../support/auth';
import { E2E_LATE_SUPERVISOR_CONFERENCE_ID, E2E_OVER_CONFERENCE_ID } from '../seed/lateSupervisor';

// Supervisors send no application and take no seat, so the registration window does not bind them:
// they sign themselves up at any point until the conference is over. The supervisor page stays
// open after registration closed, and the API has to keep that promise.

type GraphQLResult = {
	data?: {
		createConferenceSupervisor?: { id: string } | null;
		supervisorSignupOpen?: boolean | null;
	} | null;
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

async function signupOpen(page: Page, conferenceId: string) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: {
			query: `query ($c: ID!) { supervisorSignupOpen(conferenceId: $c) }`,
			variables: { c: conferenceId }
		}
	});
	return (await res.json()) as GraphQLResult;
}

test('a supervisor signs up after registration has closed', async ({ page }) => {
	await loginAs(page, makeTestUser('late-supervisor', SUPERVISOR_AGE));
	const result = await signUpAsSupervisor(page, E2E_LATE_SUPERVISOR_CONFERENCE_ID);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data?.createConferenceSupervisor?.id).toBeTruthy();
});

test('nobody signs up as supervisor once the conference is over', async ({ page }) => {
	await loginAs(page, makeTestUser('over-supervisor', SUPERVISOR_AGE));
	const result = await signUpAsSupervisor(page, E2E_OVER_CONFERENCE_ID);
	expect(result.errors?.[0]?.extensions?.code, JSON.stringify(result)).toBe('CONFLICT');
	expect(result.errors?.[0]?.message).toMatch(/conference is over/);
	expect(result.data?.createConferenceSupervisor ?? null).toBeNull();
});

test('anyone can ask whether supervisors may still sign up', async ({ page }) => {
	// Neither conference is readable to somebody without a part in it once it is under way, so the
	// page asks this instead.
	await loginAs(page, makeTestUser('supervisor-status'));
	expect(
		(await signupOpen(page, E2E_LATE_SUPERVISOR_CONFERENCE_ID)).data?.supervisorSignupOpen
	).toBe(true);
	expect((await signupOpen(page, E2E_OVER_CONFERENCE_ID)).data?.supervisorSignupOpen).toBe(false);
});

test('the supervisor page says so once the conference is over', async ({ page }) => {
	await loginAs(page, makeTestUser('over-supervisor-page'));
	await page.goto(`/registration/${E2E_OVER_CONFERENCE_ID}/supervisor`);
	await expect(page.getByText('Die Anmeldung für Betreuende ist geschlossen')).toBeVisible();
	await expect(page.getByRole('radiogroup')).toHaveCount(0);
});

test('the supervisor page offers the form after registration has closed', async ({ page }) => {
	await loginAs(page, makeTestUser('late-supervisor-page'));
	await page.goto(`/registration/${E2E_LATE_SUPERVISOR_CONFERENCE_ID}/supervisor`);
	await expect(page.getByRole('heading', { name: 'Schule / Institution' })).toBeVisible();
	await expect(page.getByText('Die Anmeldung für Betreuende ist geschlossen')).toHaveCount(0);
});
