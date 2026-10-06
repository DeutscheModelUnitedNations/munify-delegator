import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_SURVEY_QUESTION_ID,
	E2E_SURVEY_QUESTION_TITLE,
	E2E_SURVEY_OPTION_A_ID,
	E2E_SURVEY_OPTION_A_TITLE
} from '../seed/seed';

// The participant half of the survey feature (SurveyAnswer resolver + the dashboard section).
// Only surveys with draft=false and hidden=false reach participants at all, which is itself
// worth pinning down: a regression there silently hides every survey.

test('a participant can answer a published survey from their dashboard', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PREP_PARTICIPANT_USER_ID), {
		startUrl: `/dashboard/${E2E_PREP_CONFERENCE_ID}`
	});
	await waitForHydration(page);

	await expect(page.getByText(E2E_SURVEY_QUESTION_TITLE).first()).toBeVisible({ timeout: 15_000 });

	await page
		.getByRole('button', { name: /umfrage beantworten|antwort ändern/i })
		.first()
		.click();

	const option = page.locator('label', { hasText: E2E_SURVEY_OPTION_A_TITLE }).first();
	await expect(option).toBeVisible({ timeout: 15_000 });
	await option.click();

	// Scope to the modal: the dashboard behind it has its own buttons, and the accessible name
	// carries an icon prefix, so this cannot be an anchored match.
	const answerModal = page.locator('.modal-open, dialog[open]').first();
	await answerModal
		.getByRole('button', { name: /speichern|save/i })
		.first()
		.click();

	await expect
		.poll(
			async () => {
				const res = await page.request.post('/api/graphql', {
					data: {
						query: `query { findManySurveyAnswers(where: { questionId: { equals: "${E2E_SURVEY_QUESTION_ID}" } }) { option { id } } }`
					}
				});
				const rows = (await res.json())?.data?.findManySurveyAnswers;
				return Array.isArray(rows)
					? rows.map((r: { option: { id: string } }) => r.option.id)
					: undefined;
			},
			{ timeout: 15_000 }
		)
		.toEqual([E2E_SURVEY_OPTION_A_ID]);
});
