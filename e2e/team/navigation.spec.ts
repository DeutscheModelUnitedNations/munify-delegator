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

	// the side navigation's menu, not the header's account menu, which is a `ul.menu` too
	const menu = page.getByRole('navigation', { name: /seitennavigation|page navigation/i });
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

// The conference's overview is the first entry of the same menu: going there keeps the menu and
// the document, names the conference at the menu's head, and shows the team what waits for it.
test('the overview sits in the conference navigation, beside the team pages', async ({ page }) => {
	test.setTimeout(120_000);
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));

	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/stats`
	});
	await waitForHydration(page);
	await page.evaluate(() => {
		document.body.dataset.e2eSameDocument = 'yes';
	});

	const menu = page.getByRole('navigation', { name: /seitennavigation|page navigation/i });
	// the team area has no page of its own, so no crumb leads there
	await expect(page.locator('.breadcrumbs li:visible', { hasText: /^\s*Team\s*$/ })).toHaveCount(0);

	await menu.getByRole('link', { name: /übersicht|overview/i }).click();
	await expect(page).toHaveURL(new RegExp(`/dashboard/${E2E_CONFERENCE_ID}$`));
	await expect(
		page.getByTestId('team-waiting').or(page.getByTestId('team-waiting-nothing'))
	).toBeVisible({ timeout: 20_000 });
	await expect(menu.locator('a.menu-active')).toHaveAttribute(
		'href',
		new RegExp(`/dashboard/${E2E_CONFERENCE_ID}$`)
	);

	expect(await page.evaluate(() => document.body.dataset.e2eSameDocument)).toBe('yes');
	expect(errors).toEqual([]);
});
