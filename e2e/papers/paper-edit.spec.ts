import { test, expect } from '@playwright/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_DRAFT_PAPER_ID, E2E_PAPER_DELEGATE_USER_ID } from '../seed/seed';

// Covers editing an already-existing paper (author revises a draft and submits it) - distinct
// from paper-review.spec.ts, which only covers submitting a brand new paper.
test('an author can edit an existing draft paper and submit it', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/paperhub`
	});
	await waitForHydration(page);

	// Scope to the seeded draft paper's row specifically: repeated test runs accumulate other
	// papers for this same author, so `.first()` on a generic row/link locator is not reliable.
	await page.locator(`a[href*="${E2E_DRAFT_PAPER_ID}"]`).click();
	await page.waitForURL(new RegExp(`/paperhub/${E2E_DRAFT_PAPER_ID}$`), { timeout: 15_000 });

	const editor = page.locator('[contenteditable="true"]').first();
	await expect(editor).toBeVisible({ timeout: 15_000 });
	await editor.fill('Edited paper content.');

	await page.getByRole('button', { name: 'Papier einreichen' }).click();
	await expect(page.getByText(/erfolgreich eingereicht|submitted successfully/i)).toBeVisible({
		timeout: 15_000
	});

	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query { findUniquePaper(where: { id: "${E2E_DRAFT_PAPER_ID}" }) { status } }`
		}
	});
	const data = (await res.json())?.data?.findUniquePaper;
	expect(data?.status).toBe('SUBMITTED');
});
