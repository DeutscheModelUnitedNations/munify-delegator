import { expect, type Page } from '@playwright/test';
import { E2E_CONFERENCE_ID } from '../seed/seed';

/**
 * Navigates to the conference registration overview and opens the first conference that is
 * currently open for registration (the dev seed guarantees at least one conference in
 * PARTICIPANT_REGISTRATION state - see prisma/seed/dev/seed.ts). Returns the conference id.
 */
export async function openFirstConferenceForRegistration(
	page: Page,
	conferenceId: string = E2E_CONFERENCE_ID
): Promise<string> {
	await page.goto('/dashboard');

	// Target the conference explicitly rather than taking `.first()`. The seed defines more than
	// one conference, the registration list has no guaranteed order, and picking whichever card
	// happened to render first made every caller intermittently register for the wrong
	// conference - which then failed much later, in an unrelated assertion.
	// The selector page has no <main>; the conference id in the link is what picks the card.
	const registerButton = page.locator(`a[href*="${conferenceId}"]`).first();
	await expect(
		registerButton,
		`expected conference ${conferenceId} to be open for registration - is the e2e seed loaded?`
	).toBeVisible({ timeout: 15_000 });

	const href = await registerButton.getAttribute('href');
	if (!href) throw new Error('registration button had no href');

	// `resolve()` renders relative hrefs (`./registration/…`) on server-rendered pages, so compare
	// the path the link actually points at, not the attribute text.
	const target = new URL(href, page.url()).pathname;
	await registerButton.click();
	await page.waitForURL((url) => url.pathname === target);

	return conferenceId;
}

/**
 * Picks how to apply in the dashboard's application form, by the option's title, and waits for
 * the next step to open below it.
 */
export async function chooseApplyPath(page: Page, title: RegExp): Promise<void> {
	const option = page.locator('ol button.card', { hasText: title });
	// Retried: a click just after navigation can land before hydration attaches the handler.
	await expect(async () => {
		await option.click({ timeout: 2_000 });
		await expect(page.locator('ol > li')).toHaveCount(2, { timeout: 2_000 });
	}).toPass({ timeout: 15_000 });
}

/**
 * Answers the application's questions, one step each, and submits the last. Starts with the school
 * step open.
 */
export async function fillApplicationSteps(
	page: Page,
	answers: { school: string; motivation: string; experience: string }
): Promise<void> {
	await page.locator('input[name="schoolName"]').fill(answers.school);
	await page
		.locator('ol > li')
		.last()
		.getByRole('button', { name: /weiter|next/i })
		.click();
	await page.locator('textarea[name="motivation"]').fill(answers.motivation);
	await page
		.locator('ol > li')
		.last()
		.getByRole('button', { name: /weiter|next/i })
		.click();
	await page.locator('textarea[name="experience"]').fill(answers.experience);
	await page.locator('form button.btn-primary').first().click();
}
