import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_ASSIGNMENT_ADMIN_ID } from '../seed/seed';

// Breadth over depth: most management routes had no coverage at all, and the cheapest regression
// to catch during a large refactor is "the page no longer renders". Asserts each route reaches
// its own content without hitting the error page and without throwing in the browser.

// Vite's dev server transiently fails dynamic imports while it re-optimises dependencies
// (`Failed to fetch dynamically imported module`). That is a dev-server artifact, not an app
// fault, and it made this spec fail roughly one run in four. Ignore only that specific class.
const DEV_SERVER_NOISE =
	/failed to fetch dynamically imported module|importing a module script failed/i;

const ROUTES = [
	'',
	'/participants',
	'/delegations',
	'/individuals',
	'/supervisors',
	'/waitingList',
	'/payments',
	'/stats',
	'/seats',
	'/plausibility',
	'/downloads',
	'/announcement',
	'/accessFlow',
	'/postalRegistration',
	'/survey',
	'/configuration',
	'/configuration/committees'
];

test('every management route renders for an authorised admin', async ({ page }) => {
	// Seventeen full page loads in one test; the 30s default is for single-flow specs.
	test.setTimeout(240_000);
	const pageErrors: string[] = [];
	page.on('pageerror', (e) => pageErrors.push(e.message));

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }), {
		startUrl: `/management/${E2E_CONFERENCE_ID}`
	});

	const failures: string[] = [];

	for (const suffix of ROUTES) {
		const path = `/management/${E2E_CONFERENCE_ID}${suffix}`;
		pageErrors.length = 0;

		const res = await page.goto(path);
		await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

		if ((res?.status() ?? 500) >= 400) {
			failures.push(`${path}: HTTP ${res?.status()}`);
			continue;
		}

		const body = await page.locator('body').innerText();
		// SvelteKit's error page for a failed load, and the app's own access-denied copy.
		if (/hier hast du keinen zugriff|you don't have access to this page/i.test(body)) {
			failures.push(`${path}: rendered access-denied for an admin`);
		}
		const realErrors = pageErrors.filter((e) => !DEV_SERVER_NOISE.test(e));
		if (realErrors.length > 0) {
			failures.push(`${path}: uncaught browser error: ${realErrors[0]}`);
		}
	}

	expect(failures, `management routes failed to render:\n${failures.join('\n')}`).toEqual([]);
});
