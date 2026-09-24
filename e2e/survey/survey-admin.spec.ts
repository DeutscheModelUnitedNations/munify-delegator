import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_ASSIGNMENT_ADMIN_ID } from '../seed/seed';

// Surveys (management UI + SurveyQuestion/SurveyOption resolvers) had no coverage at all despite
// being recently added. Covers the admin half of the feature: create a question, give it an
// option, and have both round-trip through the API.

test('an admin can create a survey question and add an option to it', async ({ page }) => {
	// Unique per run: SurveyQuestion has @@unique([conferenceId, title]), so a fixed title would
	// collide with every previous run against a persistent database.
	const surveyTitle = `E2E Survey ${Date.now()}`;
	const optionTitle = 'E2E Option A';

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID), {
		startUrl: `/management/${E2E_CONFERENCE_ID}/survey`
	});
	await waitForHydration(page);

	await page
		.getByRole('button', { name: /umfrage erstellen|create survey/i })
		.first()
		.click();

	const modal = page.locator('.modal-open');
	await expect(modal).toBeVisible({ timeout: 15_000 });
	await modal.locator('input[type="text"]').fill(surveyTitle);
	await modal.locator('textarea').fill('Created by the e2e suite.');
	// A deadline in the future, so the survey is still answerable.
	await modal.locator('input[type="datetime-local"]').fill('2030-01-01T12:00');
	await modal.getByRole('button', { name: /^erstellen$|^create$/i }).click();

	await expect(modal).toBeHidden({ timeout: 15_000 });
	await expect(page.getByText(surveyTitle).first()).toBeVisible({ timeout: 15_000 });

	// --- add an option on the survey's detail page ---
	// Resolve the id through the API and click that exact link: the survey cards are plain divs
	// with no stable hook, and repeated runs leave several surveys on this page.
	const created = await page.request.post('/api/graphql', {
		data: {
			query: `query { findManySurveyQuestions(where: { conferenceId: { equals: "${E2E_CONFERENCE_ID}" }, title: { equals: "${surveyTitle}" } }) { id } }`
		}
	});
	const surveyId = (await created.json())?.data?.findManySurveyQuestions?.[0]?.id;
	expect(surveyId, 'survey question was not persisted').toBeTruthy();

	await page.locator(`a[href$="/survey/${surveyId}"]`).first().click();
	await page.waitForURL(new RegExp(`/survey/${surveyId}$`), { timeout: 15_000 });
	await waitForHydration(page);

	// The detail page opens on the results tab; option management lives under settings.
	await page
		.getByRole('button', { name: /einstellungen|settings/i })
		.first()
		.click();
	await page
		.getByRole('button', { name: /option erstellen|create option/i })
		.first()
		.click();
	const optionModal = page.locator('.modal-open');
	await expect(optionModal).toBeVisible({ timeout: 15_000 });
	await optionModal.locator('input[type="text"]').fill(optionTitle);
	await optionModal.locator('textarea').fill('First option.');
	await optionModal.locator('input[type="number"]').fill('5');
	await optionModal.getByRole('button', { name: /^erstellen$|^create$/i }).click();

	await expect(optionModal).toBeHidden({ timeout: 15_000 });
	await expect(page.getByText(optionTitle).first()).toBeVisible({ timeout: 15_000 });

	// Confirm it actually persisted rather than only rendering optimistically.
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findManySurveyQuestions(where: { conferenceId: { equals: "${E2E_CONFERENCE_ID}" }, title: { equals: "${surveyTitle}" } }) { title options { title upperLimit } } }`
		}
	});
	const question = (await res.json())?.data?.findManySurveyQuestions?.[0];
	expect(question?.title).toBe(surveyTitle);
	expect(question?.options).toEqual([{ title: optionTitle, upperLimit: 5 }]);
});
