import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';

// The registration tables hand search, sorting, filters and paging to the backend. Each one has
// to load, find a row by a word in it, find nothing for nonsense, sort and page without errors.
const TABLES = [
	{ route: 'management/delegations', search: 'filter' },
	{ route: 'management/individuals', search: 'filter' },
	{ route: 'management/supervisors', search: 'filter' },
	{ route: 'management/participants', search: 'search' },
	{ route: 'management/waitingList', search: 'filter' },
	{ route: 'team-management/members', search: 'filter' }
];

for (const { route, search } of TABLES) {
	test(`the ${route.split('/').pop()} table searches, sorts and pages in the backend`, async ({
		page
	}) => {
		test.setTimeout(120_000);
		const errors: string[] = [];
		page.on('pageerror', (error) => errors.push(error.message));
		const graphqlErrors: string[] = [];
		page.on('response', async (response) => {
			if (!response.url().includes('/api/graphql') || response.request().method() !== 'GET') return;
			const body = await response.text().catch(() => '');
			if (body.includes('"errors"')) graphqlErrors.push(body.slice(0, 300));
		});

		await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }), {
			startUrl: `/dashboard/${E2E_CONFERENCE_ID}/${route}`
		});
		await waitForHydration(page);

		const rows = page.locator('tbody tr');
		await expect(rows.first()).toBeVisible({ timeout: 20_000 });
		const total = await rows.count();

		// a word of the first row finds that row again
		const word = (await rows.first().innerText())
			.split(/\s+/)
			.find((token) => /^[\p{L}]{4,}$/u.test(token));
		expect(word, 'the first row has a word to search for').toBeTruthy();
		const box = page.locator('input[type="text"]').first();
		await box.fill(word ?? '');
		await expect(page).toHaveURL(new RegExp(`${search}=`));
		await expect(rows.first()).toContainText(word ?? '', { timeout: 15_000, ignoreCase: true });
		expect(await rows.count()).toBeLessThanOrEqual(total);

		// nonsense finds nothing
		await box.fill('zzqxjvk');
		await expect(page.locator('tbody td[colspan]')).toBeVisible({ timeout: 15_000 });
		await box.fill('');
		await expect(rows.first()).toBeVisible({ timeout: 15_000 });

		// a sortable column sorts: the URL says so and the table keeps showing rows
		const sortable = page.locator('thead th button:has(i.fa-arrows-up-down)').first();
		if (await sortable.count()) {
			await sortable.click();
			await expect(page).toHaveURL(/sort=/);
			await expect(rows.first()).toBeVisible({ timeout: 15_000 });
		}

		// the pager has its range and, where there is more than one page, moves on
		const next = page.getByRole('button', { name: 'Next page' });
		if (await next.isEnabled()) {
			await next.click();
			await expect(page).toHaveURL(/page=2/);
			await expect(rows.first()).toBeVisible({ timeout: 15_000 });
		}

		expect(errors, 'no uncaught browser errors').toEqual([]);
		expect(graphqlErrors, 'no GraphQL errors').toEqual([]);
	});
}
