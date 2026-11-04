import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';

// The user manual is public, keeps the reader's language, and every help entry point leads to
// the page about the route on screen.

test('the manual is public and opens at its start page', async ({ page }) => {
	await page.goto('/docs');
	await expect(page).toHaveURL(/\/docs\/user-manual\/introduction$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Einführung' })).toBeVisible();
	await expect(page.getByRole('navigation', { name: 'Handbuch' })).toBeVisible();
});

test('an English reader stays in English across the manual', async ({ page }) => {
	await page.goto('/en/docs/user-manual/introduction');
	await expect(page.getByRole('heading', { level: 1, name: 'Introduction' })).toBeVisible();
	const article = page.locator('article');
	const link = article.locator('a[href*="/docs/user-manual/participant/registration"]').first();
	await expect(link).toHaveAttribute('href', /^\/en\/docs\//);
	await link.click();
	await expect(page).toHaveURL(/\/en\/docs\/user-manual\/participant\/registration/);
	await expect(page.getByRole('heading', { level: 1, name: 'Registration' })).toBeVisible();
});

test('an unknown manual page is a 404', async ({ page }) => {
	const res = await page.goto('/docs/user-manual/does-not-exist');
	expect(res?.status()).toBe(404);
});

test('the help button, the team menu and the footer lead to the page about the route', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/assignment/sighting`
	});
	await waitForHydration(page);
	const target = '/docs/user-manual/team/assignment#sighting';

	await page.getByTestId('help-menu').click();
	await expect(
		page.getByRole('link', { name: 'Handbuch zu dieser Seite' }).first()
	).toHaveAttribute('href', target);
	await expect(page.getByTestId('team-manual-link')).toHaveAttribute('href', target);
	await expect(page.locator('footer').getByRole('link', { name: 'Handbuch' })).toHaveAttribute(
		'href',
		target
	);
});
