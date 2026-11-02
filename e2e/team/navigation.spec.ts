import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';

// Moving between team pages is a client-side navigation: the side navigation stays, the entry
// clicked becomes the active one, and the page's content arrives below (behind its skeleton
// while it loads). No page error and no full reload along the way.
test('the team navigation switches pages client-side and marks the open one', async ({ page }) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/stats`
	});
	await waitForHydration(page);
	// A full load arrives with its content: no skeleton is rendered on the server
	await expect(page.locator('[data-skeleton]')).toHaveCount(0);

	// a marker that survives only as long as the document does
	await page.evaluate(() => {
		document.body.dataset.e2eSameDocument = 'yes';
	});

	const menu = page.locator('ul.menu').first();
	await menu
		.getByRole('link', { name: /participants|teilnehmende/i })
		.first()
		.click();
	await expect(page).toHaveURL(new RegExp(`/dashboard/${E2E_CONFERENCE_ID}/team/participants`));
	await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20_000 });
	// once the data is there the skeleton is gone again
	await expect(page.locator('[data-skeleton]')).toHaveCount(0);

	// the entry opened is the active one, and it is the only one
	const active = menu.locator('a.menu-active');
	await expect(active).toHaveCount(1);
	await expect(active).toHaveAttribute('href', /team\/participants/);

	expect(await page.evaluate(() => document.body.dataset.e2eSameDocument)).toBe('yes');
	expect(errors).toEqual([]);
});
