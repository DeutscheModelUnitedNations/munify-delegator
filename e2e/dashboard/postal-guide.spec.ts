import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { POSTAL_GUIDE } from '../seed/postalGuide';

// The postal registration goes step by step: what it is about, one's details and age, how to send
// the documents (to be watched the first time, skippable from then on), then the download.

const GUIDE_STEPS = 11;
/** Longer than a step of the guide has to be watched (`SCENE_MS`). */
const STEP_WATCHED = 6500;

const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('the documents come after checking the details and watching the hints, and it remembers where one was', async ({
	page
}) => {
	const startUrl = `/dashboard/${POSTAL_GUIDE.conferenceId}/postal-registration`;
	await loginAs(page, fixedTestUser(POSTAL_GUIDE.pennyId), { startUrl });
	const download = button(page, 'Dokumente herunterladen');
	const step = (name: string) => page.getByRole('heading', { name, exact: true });

	// --- a wrong age leads to the profile and back here; a reopened step closes what follows ---
	await expect(page.getByText('Alle Unterschriften müssen handschriftlich sein')).toBeVisible();
	await button(page, 'Weiter').click();
	await button(page, 'Meine Angaben stimmen').click();
	await expect(page.getByText(/damit volljährig/)).toBeVisible();
	await button(page, 'Nein').click();
	await expect(page.getByRole('link', { name: 'Profil aktualisieren' })).toHaveAttribute(
		'href',
		/my-account\?redirect=.*postal-registration/
	);
	await button(page, 'Noch mal ansehen').click();
	await expect(step('Volljährigkeit')).toHaveCount(0);

	// --- it goes on where they left off ---
	await expect(async () => {
		await page.reload();
		await waitForHydration(page);
		await expect(button(page, 'Ja, das stimmt')).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });
	await expect(button(page, 'Meine Angaben stimmen')).toHaveCount(0);

	// --- the hints cannot be skipped the first time; each opens the next once it was watched ---
	// timed by animation frames, which the clock fast-forwards
	await button(page, 'Ja, das stimmt').click();
	await expect(step('Alles sorgfältig lesen')).toBeVisible();
	await expect(page.getByText(/Sieh dir zuerst alle Schritte/)).toBeVisible();
	await page.clock.install();
	await expect(button(page, 'Gleich geht es weiter')).toBeDisabled();
	await expect(button(page, 'Überspringen')).toHaveCount(0);
	for (let hint = 1; hint <= GUIDE_STEPS; hint++) {
		await expect(page.getByText(`Schritt ${hint} von ${GUIDE_STEPS}`)).toBeVisible();
		await page.clock.runFor(STEP_WATCHED);
		await button(page, 'Weiter').click();
	}
	await expect(step('Das Wichtigste im Überblick')).toBeVisible();
	await expect(download).toHaveCount(0);
	await button(page, 'Weiter').click();
	await expect(download).toBeVisible();

	// --- completed, it opens at the download; the hints may be watched again, and skipped ---
	await expect(async () => {
		await page.reload();
		await waitForHydration(page);
		await expect(download).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });
	await expect(page.getByText(/Eltern|Erziehungsberechtigt/)).toHaveCount(0);
	await button(page, 'Noch mal ansehen').last().click();
	await button(page, 'Überspringen').click();
	await expect(download).toBeVisible();
});
