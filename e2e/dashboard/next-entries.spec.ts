import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { NEXT_ENTRIES } from '../seed/nextEntries';

// The schedule is on a fixed day (e2e/seed/nextEntries.ts), in Berlin summer time: 07:30Z is 09:30.
const DURING_SESSION = `${NEXT_ENTRIES.date}T07:30:00Z`;
const BETWEEN = `${NEXT_ENTRIES.date}T09:35:00Z`;
const AFTERWARDS = `${NEXT_ENTRIES.date}T18:00:00Z`;

const DASHBOARD = `/dashboard/${NEXT_ENTRIES.conferenceId}`;
const section = (page: Page) => page.locator('[data-tour="dashboard.next-entries"]');

/** Signs in and opens the page with the browser's clock at `now`. */
async function openAt(page: Page, options: { userId: string; now: string; path?: string }) {
	await loginAs(page, fixedTestUser(options.userId));
	await page.clock.setSystemTime(new Date(options.now));
	await page.goto(options.path ?? DASHBOARD);
}

// The live spec changes the room of the session the first spec reads, so they run in order
test.describe.configure({ mode: 'serial' });

test('a delegate sees what is on and what comes next on their own track', async ({ page }) => {
	await openAt(page, { userId: NEXT_ENTRIES.nadjaId, now: DURING_SESSION });

	const running = section(page).getByRole('button', { name: /Sitzung des SR/ });
	await expect(running).toContainText('Jetzt', { timeout: 20_000 });
	await expect(running).toContainText('bis 11:00');
	await expect(running).toContainText('Landtag · 202');
	await expect(section(page).getByRole('listitem')).toContainText([
		'Mittagessen',
		'Abschlussfeier'
	]);
	await expect(section(page)).not.toContainText('Sitzung der GV');

	// An entry opens with its details
	await section(page)
		.getByRole('button', { name: /Mittagessen/ })
		.click();
	const details = page.getByRole('dialog');
	await expect(details).toContainText('12:00 – 13:00');
	await expect(details).toContainText('Mit der U-Bahn bis Waterloo.');
	await page.keyboard.press('Escape');
	await expect(details).toBeHidden();

	// The whole schedule opens on their track
	await section(page).getByRole('link', { name: 'Ganzer Zeitplan' }).click();
	await expect(page.getByRole('button', { name: 'SR-Track' })).toHaveAttribute(
		'aria-pressed',
		'true',
		{ timeout: 20_000 }
	);
	await expect(page.getByText('Sitzung der GV')).toHaveCount(0);
	await page.getByRole('button', { name: 'Alle Tracks' }).click();
	await expect(page.getByText('Sitzung der GV')).toBeVisible();
});

test('between two entries it says how long until the next one', async ({ page }) => {
	await openAt(page, { userId: NEXT_ENTRIES.nadjaId, now: BETWEEN });

	const next = section(page).getByRole('button', { name: /Mittagessen/ });
	await expect(next).toContainText(/in 2\d Minuten/, { timeout: 20_000 });
	await expect(next).toContainText('12:00 – 13:00');
	await expect(section(page)).not.toContainText('Jetzt');
});

test('a room the team changes shows right away', async ({ page, browser }) => {
	test.setTimeout(90_000);
	await openAt(page, { userId: NEXT_ENTRIES.nadjaId, now: DURING_SESSION });
	await expect(section(page)).toContainText('202', { timeout: 20_000 });

	const team = await browser.newContext();
	const teamPage = await team.newPage();
	await loginAs(teamPage, fixedTestUser(NEXT_ENTRIES.careId));
	const moveTo = (room: string) =>
		teamPage.request.post('/api/graphql', {
			data: {
				query: `mutation { updateCalendarEntry(id: "${NEXT_ENTRIES.sessionId}", room: "${room}") { id } }`
			}
		});
	try {
		// A change made before the subscription has its first result is lost, so repeat it
		await expect(async () => {
			await moveTo('Neuer Raum');
			await expect(section(page)).toContainText('Neuer Raum', { timeout: 3_000 });
		}).toPass({ timeout: 30_000 });
	} finally {
		await moveTo('202');
		await team.close();
	}
});

test('once everything is over the section is gone', async ({ page }) => {
	await openAt(page, { userId: NEXT_ENTRIES.nadjaId, now: AFTERWARDS });

	await expect(page.locator('[data-tour="dashboard.quick-links"]')).toBeVisible({
		timeout: 20_000
	});
	await expect(section(page)).toHaveCount(0);
});

test('the team has no next entries on its overview', async ({ page }) => {
	await openAt(page, { userId: NEXT_ENTRIES.careId, now: DURING_SESSION });

	await expect(page.locator('[data-tour="dashboard.stages"]')).toBeVisible({ timeout: 20_000 });
	await expect(section(page)).toHaveCount(0);
});
