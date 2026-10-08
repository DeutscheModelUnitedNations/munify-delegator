import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID } from '../seed/seed';

test('an admin can build a calendar day with a place and an entry, and drag it around', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/calendar`
	});

	const dayName = `E2E Day ${Date.now()}`;
	const placeName = `E2E Place ${Date.now()}`;
	const entryName = `E2E Entry ${Date.now()}`;

	// --- Days & tracks tab: create a day ---
	await page.getByRole('tab', { name: 'Tage & Tracks', exact: true }).click();
	await page.getByRole('button', { name: 'Tag hinzufügen' }).first().click();

	const dayModal = page.locator('.modal.modal-open');
	await dayModal.locator('input[type="text"]').fill(dayName);
	await dayModal.locator('input[type="date"]').fill('2026-09-15');
	await dayModal.getByRole('button', { name: 'Erstellen' }).click();
	await expect(dayModal).toBeHidden({ timeout: 15_000 });
	await expect(page.getByText(dayName)).toBeVisible({ timeout: 15_000 });

	// --- Places tab: create a place ---
	await page.getByRole('tab', { name: 'Orte', exact: true }).click();
	await page.getByRole('button', { name: 'Ort hinzufügen' }).first().click();

	const placeModal = page.locator('.modal.modal-open');
	await placeModal.locator('input[type="text"]').first().fill(placeName);
	await placeModal.getByRole('button', { name: 'Erstellen' }).click();
	await expect(placeModal).toBeHidden({ timeout: 15_000 });
	await expect(page.getByText(placeName)).toBeVisible({ timeout: 15_000 });

	// --- Calendar tab: create an entry on the day just created ---
	await page.getByRole('tab', { name: 'Kalender', exact: true }).click();
	await page.getByRole('button', { name: 'Eintrag hinzufügen' }).first().click();

	const entryModal = page.locator('.modal.modal-open');
	await entryModal.locator('input[type="text"]').first().fill(entryName);
	const dayValue = await entryModal
		.locator('select option', { hasText: dayName })
		.first()
		.getAttribute('value');
	await entryModal.locator('select').first().selectOption(dayValue);
	await entryModal.locator('input[type="time"]').first().fill('10:00');
	await entryModal.locator('input[type="time"]').nth(1).fill('11:00');
	await entryModal.locator('select').last().selectOption({ label: placeName });
	await entryModal.getByRole('button', { name: 'Erstellen' }).click();
	await expect(entryModal).toBeHidden({ timeout: 15_000 });

	// --- Drag the card an hour down, then stretch its lower edge by half an hour ---
	const card = page.locator('[data-entry-id]', { hasText: entryName });
	await expect(card).toBeVisible({ timeout: 15_000 });
	await card.scrollIntoViewIfNeeded();

	const entryTimes = async () => {
		const res = await page.request.post('/api/graphql', {
			data: {
				query: `query { calendarEntries(where: { name: { eq: "${entryName}" } }) { startTime endTime } }`
			}
		});
		const entry = (await res.json()).data?.calendarEntries?.[0];
		return `${entry?.startTime}/${entry?.endTime}`;
	};
	/** One hour is 72px in the editor */
	const HOUR = 72;

	let box = await card.boundingBox();
	if (!box) throw new Error('entry card has no box');
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + HOUR / 2, { steps: 4 });
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + HOUR, { steps: 4 });
	await page.mouse.up();
	await expect
		.poll(entryTimes, { timeout: 15_000 })
		.toBe('2026-09-15T11:00:00.000Z/2026-09-15T12:00:00.000Z');

	box = await card.boundingBox();
	if (!box) throw new Error('entry card has no box');
	await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2 + HOUR / 4, { steps: 4 });
	await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2 + HOUR / 2, { steps: 4 });
	await page.mouse.up();
	await expect
		.poll(entryTimes, { timeout: 15_000 })
		.toBe('2026-09-15T11:00:00.000Z/2026-09-15T12:30:00.000Z');

	// --- A click on empty space (two hours above the card: 09:00) opens a new entry at that time ---
	box = await card.boundingBox();
	if (!box) throw new Error('entry card has no box');
	await page.mouse.click(box.x + box.width / 2, box.y - 2 * HOUR + 10);
	const createModal = page.locator('.modal.modal-open');
	await expect(createModal.locator('input[type="time"]').first()).toHaveValue('09:00');
	await createModal.getByRole('button', { name: 'Abbruch' }).click();
	await expect(createModal).toBeHidden();

	// Verify the entry actually persisted (and is linked to the place) via the API rather than
	// the preview tab's rendering, which - across repeated local runs - accumulates many same-day
	// fixtures and can scroll/hide older ones behind a day-switcher.
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { calendarEntries(where: { name: { eq: "${entryName}" } }) { name place { name } } }`
		}
	});
	const json = await res.json();
	expect(json.data?.calendarEntries?.[0]?.name).toBe(entryName);
	expect(json.data?.calendarEntries?.[0]?.place?.name).toBe(placeName);
});
