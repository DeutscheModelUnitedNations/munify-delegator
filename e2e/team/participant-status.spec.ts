import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID, E2E_MGMT_TARGET_FAMILY_NAME } from '../seed/seed';

test('a team member can mark a participant payment status as done from the participants table', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		// Filter to the target via the page's `q` (search) query param. The participants table
		// paginates, and every run adds newly registered users to this conference, so the seeded
		// target eventually falls off the first page and a bare row lookup starts timing out.
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/participants?q=${E2E_MGMT_TARGET_FAMILY_NAME}`
	});

	// A filter that narrows the table to one row opens that row's user card by itself.
	const statusTab = page.getByRole('tab', { name: /formalitäten|formalities/i });
	await expect(statusTab).toBeVisible({ timeout: 15_000 });
	await statusTab.click();

	// The state is text that opens the menu of states; an open one has a button that settles it
	const payment = (state: string) =>
		page.getByRole('button', {
			name: new RegExp(`^(beitragszahlung|fee payment): (${state})$`, 'i')
		});
	const menu = page.getByRole('group', { name: /^(beitragszahlung|fee payment)$/i });

	await payment('ausstehend|pending|problem|erledigt|done').first().click({ timeout: 15_000 });
	await menu.getByRole('button', { name: /^problem$/i }).click();
	await expect(payment('problem')).toBeVisible({ timeout: 15_000 });

	await payment('erledigt|done').click();
	await expect(payment('problem')).toHaveCount(0, { timeout: 15_000 });
	await expect(payment('erledigt|done')).toHaveCount(1);
});
