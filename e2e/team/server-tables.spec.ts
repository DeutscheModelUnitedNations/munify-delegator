import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';

// The team's tables hand search, sorting, filters, grouping and paging to the backend's table
// engine (`dataTablePage`). Each one has to load, find a row by a word in it, find nothing for
// nonsense, sort and page without errors.
const TABLES = ['team/participants', 'team/waiting-list', 'team/members', 'team/schools'];

for (const route of TABLES) {
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
		const box = page.locator('input[type="search"]').first();
		await box.fill(word ?? '');
		await expect(page).toHaveURL(/[?&]q=/);
		await expect(rows.first()).toContainText(word ?? '', { timeout: 15_000, ignoreCase: true });
		expect(await rows.count()).toBeLessThanOrEqual(total);

		// nonsense finds nothing
		await box.fill('zzqxjvk');
		await expect(page.locator('tbody td[colspan]')).toBeVisible({ timeout: 15_000 });
		await box.fill('');
		await expect(rows.first()).toBeVisible({ timeout: 15_000 });

		// a sortable column sorts: the URL holds the changed view and the table keeps showing rows
		const sortable = page.locator('thead th button:has(i.ph-arrows-down-up)').first();
		if (await sortable.count()) {
			await sortable.click();
			await expect(page).toHaveURL(/[?&]state=/);
			await expect(rows.first()).toBeVisible({ timeout: 15_000 });
		}

		// the pager has its range and, where there is more than one page (only then it has buttons),
		// moves on
		const next = page.getByRole('button', { name: /nächste seite|next page/i });
		if ((await next.count()) > 0 && (await next.isEnabled())) {
			await next.click();
			await expect(page).toHaveURL(/page=2/);
			await expect(rows.first()).toBeVisible({ timeout: 15_000 });
		}

		expect(errors, 'no uncaught browser errors').toEqual([]);
		expect(graphqlErrors, 'no GraphQL errors').toEqual([]);
	});
}
