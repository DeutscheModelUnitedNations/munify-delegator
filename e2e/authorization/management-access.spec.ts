import { test, expect } from '@playwright/test';
import { loginAs, makeTestUser } from '../support/auth';
import { E2E_CONFERENCE_ID } from '../seed/seed';

// The app's `noAccess` message, in both locales the suite may run under.
const m_noAccess = /hier hast du keinen zugriff|you don't have access to this page/i;

// Every other spec drives a happy path as an actor who IS allowed to do the thing. These cover
// the inverse - that a plain participant is refused - which is what actually guards the
// management area. Without them a broken ability rule looks exactly like a passing suite.

const MANAGEMENT_ROUTES = [
	'',
	'/participants',
	'/delegations',
	'/configuration',
	'/payments',
	'/stats',
	'/supervisors',
	'/individuals'
];

test('a plain participant is refused every management route for a conference', async ({ page }) => {
	await loginAs(page, makeTestUser('authz-outsider'), { startUrl: '/dashboard' });

	for (const suffix of MANAGEMENT_ROUTES) {
		const path = `/management/${E2E_CONFERENCE_ID}${suffix}`;
		const res = await page.goto(path);

		// Routes that render server-side fail the layout guard with a 403 status. Routes that opt
		// out of SSR (`export const ssr = false`, e.g. /stats) return a 200 shell and run the same
		// guard in the browser, so the status alone would wrongly read as "allowed" - assert on
		// what the user actually ends up seeing instead.
		if (res?.status() !== 403) {
			await expect(page.getByText(m_noAccess), `expected ${path} to refuse access`).toBeVisible({
				timeout: 15_000
			});
		}
	}
});

test('a plain participant cannot read other participants through the API', async ({ page }) => {
	await loginAs(page, makeTestUser('authz-api-outsider'), { startUrl: '/dashboard' });

	// The participants table is the management view this user was just refused; the resolver
	// behind it must refuse too, otherwise the route guard is the only thing protecting the data.
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findManyConferenceParticipantStatuss(where: { conferenceId: { equals: "${E2E_CONFERENCE_ID}" } }) { id } }`
		}
	});
	const json = await res.json();

	const rows = json?.data?.findManyConferenceParticipantStatuss;
	// Either the resolver errors, or it scopes the result to nothing this user may see.
	expect(json.errors !== undefined || (Array.isArray(rows) && rows.length === 0)).toBe(true);
});
