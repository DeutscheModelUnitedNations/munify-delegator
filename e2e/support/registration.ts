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
	await page.goto('/registration');

	// Target the conference explicitly rather than taking `.first()`. The seed defines more than
	// one conference, the registration list has no guaranteed order, and picking whichever card
	// happened to render first made every caller intermittently register for the wrong
	// conference - which then failed much later, in an unrelated assertion.
	const registerButton = page.locator(`main a.btn-primary[href*="${conferenceId}"]`).first();
	await expect(
		registerButton,
		`expected conference ${conferenceId} to be open for registration - is the e2e seed loaded?`
	).toBeVisible({ timeout: 15_000 });

	const href = await registerButton.getAttribute('href');
	if (!href) throw new Error('registration button had no href');

	await registerButton.click();
	await page.waitForURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));

	return conferenceId;
}
