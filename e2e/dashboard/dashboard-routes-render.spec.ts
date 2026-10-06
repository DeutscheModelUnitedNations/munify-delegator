import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_PREP_CONFERENCE_ID, E2E_PREP_PARTICIPANT_USER_ID } from '../seed/seed';

// The participant-side counterpart to management-routes-render.spec.ts. Uses the PREPARATION
// conference with an assigned participant, so the post-registration dashboard routes (attendance,
// paper hub, calendar-backed views) are actually reachable rather than gated off.

// Vite's dev server transiently fails dynamic imports while it re-optimises dependencies
// (`Failed to fetch dynamically imported module`). That is a dev-server artifact, not an app
// fault, and it made this spec fail roughly one run in four. Ignore only that specific class.
const DEV_SERVER_NOISE =
	/failed to fetch dynamically imported module|importing a module script failed/i;

const ROUTES = ['', '/info', '/attendance', '/paperhub', '/payment', '/postalRegistration'];

test('the participant dashboard routes render for an assigned participant', async ({ page }) => {
	test.setTimeout(180_000);

	const pageErrors: string[] = [];
	page.on('pageerror', (e) => pageErrors.push(e.message));

	await loginAs(page, fixedTestUser(E2E_PREP_PARTICIPANT_USER_ID), {
		startUrl: `/dashboard/${E2E_PREP_CONFERENCE_ID}`
	});

	const failures: string[] = [];

	for (const suffix of ROUTES) {
		const path = `/dashboard/${E2E_PREP_CONFERENCE_ID}${suffix}`;
		pageErrors.length = 0;

		const res = await page.goto(path);
		await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

		if ((res?.status() ?? 500) >= 400) {
			failures.push(`${path}: HTTP ${res?.status()}`);
			continue;
		}
		const body = await page.locator('body').innerText();
		if (/hier hast du keinen zugriff|you don't have access to this page/i.test(body)) {
			failures.push(`${path}: rendered access-denied for an assigned participant`);
		}
		const realErrors = pageErrors.filter((e) => !DEV_SERVER_NOISE.test(e));
		if (realErrors.length > 0) {
			failures.push(`${path}: uncaught browser error: ${realErrors[0]}`);
		}
	}

	expect(failures, `dashboard routes failed to render:\n${failures.join('\n')}`).toEqual([]);
});
