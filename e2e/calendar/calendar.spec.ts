import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID } from '../seed/seed';

test('an admin can build a calendar day with a place and an entry', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		startUrl: `/management/${E2E_CONFERENCE_ID}/calendar`
	});

	const dayName = `E2E Day ${Date.now()}`;
	const placeName = `E2E Place ${Date.now()}`;
	const entryName = `E2E Entry ${Date.now()}`;

	// --- Days tab: create a day ---
	await page.getByRole('tab', { name: 'Tage', exact: true }).click();
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

	// --- Entries tab: create an entry on the day just created ---
	await page.getByRole('tab', { name: 'Einträge', exact: true }).click();
	await page.locator('select.select-bordered').first().selectOption({ label: dayName });

	await page.getByRole('button', { name: 'Eintrag hinzufügen' }).first().click();

	const entryModal = page.locator('.modal.modal-open');
	await entryModal.locator('input[type="text"]').first().fill(entryName);
	await entryModal.locator('input[type="time"]').first().fill('10:00');
	await entryModal.locator('input[type="time"]').nth(1).fill('11:00');
	await entryModal.locator('select').last().selectOption({ label: placeName });
	await entryModal.getByRole('button', { name: 'Erstellen' }).click();
	await expect(entryModal).toBeHidden({ timeout: 15_000 });
	await expect(page.getByText(entryName)).toBeVisible({ timeout: 15_000 });

	// Verify the entry actually persisted (and is linked to the place) via the API rather than
	// the preview tab's rendering, which - across repeated local runs - accumulates many same-day
	// fixtures and can scroll/hide older ones behind a day-switcher.
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findManyCalendarEntries(where: { name: { equals: "${entryName}" } }) { name place { name } } }`
		}
	});
	const json = await res.json();
	expect(json.data?.findManyCalendarEntries?.[0]?.name).toBe(entryName);
	expect(json.data?.findManyCalendarEntries?.[0]?.place?.name).toBe(placeName);
});
