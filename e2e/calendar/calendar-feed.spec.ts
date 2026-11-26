import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { CALENDAR_FEED } from '../seed/calendarFeed';

const CALENDAR = `/dashboard/${CALENDAR_FEED.conferenceId}/calendar`;

/** Opens the subscription dialog and answers the link it shows. */
async function subscriptionLink(page: Page) {
	await page.getByRole('button', { name: 'Im Kalender abonnieren' }).click();
	const dialog = page.getByRole('dialog', { name: 'Zeitplan abonnieren' });
	const link = dialog.getByRole('textbox', { name: 'Abo-Link' });
	await expect(link).toHaveValue(/\/calendar\/.+\.ics$/, { timeout: 20_000 });
	return { dialog, link, url: await link.inputValue() };
}

const summaries = (ics: string) =>
	ics
		.split('\r\n')
		.filter((line) => line.startsWith('SUMMARY:'))
		.map((line) => line.slice('SUMMARY:'.length));

// The reset spec replaces the link the first one reads
test.describe.configure({ mode: 'serial' });

test('a subscription link shows the own schedule to a calendar app without signing in', async ({
	page,
	request
}) => {
	await loginAs(page, fixedTestUser(CALENDAR_FEED.fionaId));
	await page.goto(CALENDAR);
	const { url } = await subscriptionLink(page);

	// `request` carries none of the page's cookies, like a calendar app
	const response = await request.get(url);
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('text/calendar');
	const ics = await response.text();
	expect(ics).toContain(`X-WR-CALNAME:${CALENDAR_FEED.title}`);
	expect(summaries(ics).toSorted()).toEqual(
		[CALENDAR_FEED.shared, CALENDAR_FEED.pickedExcursion, CALENDAR_FEED.ownSession].toSorted()
	);
	// Berlin wall clock, in UTC: 09:00 is 07:00Z in October
	expect(ics).toContain('DTSTART:20261011T070000Z');

	// Opening the dialog again shows the same link
	await page.keyboard.press('Escape');
	expect((await subscriptionLink(page)).url).toBe(url);
});

test('a new link replaces the old one', async ({ page, request }) => {
	await loginAs(page, fixedTestUser(CALENDAR_FEED.fionaId));
	await page.goto(CALENDAR);
	const { dialog, link, url: oldUrl } = await subscriptionLink(page);

	await dialog.getByRole('button', { name: 'Neuen Link erstellen' }).click();
	// the confirmation on top of the subscription dialog
	await page
		.getByRole('dialog')
		.filter({ hasText: 'Der bisherige Link funktioniert dann nicht mehr' })
		.getByRole('button', { name: 'Neuen Link erstellen' })
		.click();
	await expect(link).not.toHaveValue(oldUrl);
	const newUrl = await link.inputValue();

	expect((await request.get(oldUrl)).status()).toBe(404);
	expect((await request.get(newUrl)).status()).toBe(200);
});

test('a link nobody made is not found', async ({ request }) => {
	expect((await request.get('/calendar/nofeed.AAAAAAAAAAAAAAAAAAAAAA.ics')).status()).toBe(404);
});

test('the schedule downloads as a calendar file to import once', async ({ page }) => {
	await loginAs(page, fixedTestUser(CALENDAR_FEED.fionaId));
	await page.goto(CALENDAR);
	const href = await page
		.getByRole('link', { name: 'Herunterladen (.ics)' })
		.getAttribute('href', { timeout: 20_000 });
	expect(href).toBeTruthy();

	// `page.request` carries the session
	const response = await page.request.get(href ?? '');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-disposition']).toContain('attachment');
	expect(summaries(await response.text())).toContain(CALENDAR_FEED.ownSession);
});
