import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_PAPER_DELEGATE_USER_ID, E2E_PAPER_REVIEWER_ID } from '../seed/seed';

test('a delegate can submit a position paper and a reviewer can accept it', async ({ browser }) => {
	const delegateContext = await browser.newContext();
	const delegatePage = await delegateContext.newPage();

	await loginAs(delegatePage, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/paperhub/newPaper`
	});

	// Type is defaulted to POSITION_PAPER server-side; only the agenda item needs picking.
	await delegatePage.locator('select[name="agendaItemId"]').selectOption({ index: 1 });
	await delegatePage.locator('[contenteditable="true"]').first().fill('E2E test paper content.');

	await delegatePage.locator('button:has(.fa-paper-plane)').click();
	await delegatePage.waitForURL(new RegExp(`/paperhub$`), { timeout: 15_000 });

	await delegateContext.close();

	const reviewerContext = await browser.newContext();
	const reviewerPage = await reviewerContext.newPage();

	await loginAs(reviewerPage, fixedTestUser(E2E_PAPER_REVIEWER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/paperhub`
	});

	// The team view groups papers under a committee -> agenda item accordion; expand both,
	// then open the paper row.
	await reviewerPage.getByRole('button', { name: 'E2E Test Committee', exact: false }).click();
	await reviewerPage.getByRole('button', { name: 'E2E Test Agenda Item', exact: false }).click();
	await reviewerPage.locator('tbody tr').first().click();

	const commentsEditor = reviewerPage.locator('[contenteditable="true"]').first();
	await expect(commentsEditor).toBeVisible({ timeout: 15_000 });
	await commentsEditor.fill('Looks good.');

	// Two radios render for the available transitions: CHANGES_REQUESTED, then ACCEPTED.
	await reviewerPage.locator('label:has(input[name="status_tabs"])').nth(1).click();

	await reviewerPage.getByRole('button', { name: /bewertung abgeben|submit review/i }).click();
	await reviewerPage
		.locator('.modal-action')
		.getByRole('button', { name: /bewertung abgeben|submit review/i })
		.click();

	await expect(
		reviewerPage.getByText(/erfolgreich gespeichert|review was saved successfully/i)
	).toBeVisible({ timeout: 15_000 });
});
