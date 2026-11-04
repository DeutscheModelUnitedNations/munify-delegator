import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_MGMT_ADMIN_ID } from '../seed/seed';

// The team's tables (`#lib/components/dataGrid`): a condition from the filter builder narrows the
// rows, grouping shows collapsible groups with their counts, and the result saved as a personal
// view opens again from the views menu - here on the participants table, as participant care.

test('the participants table filters, groups and keeps a personal view', async ({ page }) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await loginAs(page, fixedTestUser(E2E_MGMT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/participants`
	});
	await waitForHydration(page);
	const rows = page.locator('table[aria-label] tbody tr');
	await expect(rows.first()).toBeVisible({ timeout: 20_000 });

	const filterButton = page.getByRole('button', { name: /^(Filter|Filters)/ });
	const conditions = async () => Number((await filterButton.innerText()).replace(/\D/g, '') || 0);
	const before = await conditions();

	// A condition on a column of its own, from the column header's funnel
	await page
		.locator('thead th')
		.filter({ hasText: /E-Mail|Email/ })
		.getByRole('button', { name: /filtern|filter by/i })
		.click();
	const panel = page.getByRole('dialog');
	await expect(panel).toBeVisible();
	await panel.locator('input[type="text"]').last().fill('@');
	await expect.poll(conditions, { timeout: 10_000 }).toBe(before + 1);
	await page.keyboard.press('Escape');
	await expect(page).toHaveURL(/[?&]state=/);

	// Grouped by the kind of participation: groups with their counts, closed and opened again
	await page
		.getByRole('button', { name: /^(Gruppieren|Group)/ })
		.first()
		.click();
	await page.getByRole('button', { name: /Gruppieren nach|Group by/ }).click();
	await page.getByRole('dialog').locator('select').first().selectOption('role');
	await page.keyboard.press('Escape');
	const groupHeader = page.locator('tbody button[aria-expanded]').first();
	await expect(groupHeader).toBeVisible({ timeout: 15_000 });
	await expect(groupHeader).toHaveAttribute('aria-expanded', 'true');
	await groupHeader.click();
	await expect(groupHeader).toHaveAttribute('aria-expanded', 'false');

	// Saved as a personal view, the table opens on it from the views menu
	const name = `E2E view ${Date.now()}`;
	const viewsButton = page.locator('.dropdown > button:has(.fa-table-layout)');
	await viewsButton.click();
	await page.getByRole('button', { name: /Als neue Ansicht speichern|Save as a new view/ }).click();
	await page.locator('#view-name-form input:not([type])').fill(name);
	await page
		.locator('.modal-box:has(#view-name-form)')
		.getByRole('button', { name: /^(Speichern|Save)$/ })
		.click();
	await expect(viewsButton).toContainText(name, { timeout: 15_000 });

	await page.goto(`/dashboard/${E2E_CONFERENCE_ID}/team/participants`);
	await waitForHydration(page);
	await expect(viewsButton).not.toContainText(name);
	await viewsButton.click();
	await page.getByRole('button', { name }).click();
	await expect(page.locator('tbody button[aria-expanded]').first()).toBeVisible({
		timeout: 15_000
	});

	// Deleted again, so reruns start from the base view
	await viewsButton.click();
	await page.getByRole('button', { name: /Ansicht löschen|Delete view/ }).click();
	await page
		.getByRole('button', { name: /Ansicht löschen|Delete view/ })
		.last()
		.click();
	await expect(viewsButton).not.toContainText(name, { timeout: 15_000 });

	expect(errors, 'no uncaught browser errors').toEqual([]);
});
