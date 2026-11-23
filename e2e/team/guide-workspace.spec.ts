import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { E2E_GUIDE } from '../seed/guide';

// The team's guide workspace (team/guide, docs/plans/guide.md): the tree of the sidebar draft
// with pages outside it, publishing pages and sidebar together, who sees what, and the committee
// matrix. Its own conference (E2E_GUIDE.workspace), as these change the sidebar and create pages.

const w = E2E_GUIDE.workspace;
const base = `/dashboard/${w.conference}/team/guide`;

async function openAsContentLead(page: Page, path = '') {
	await loginAs(page, fixedTestUser(E2E_GUIDE.people.contentLeadD), { startUrl: `${base}${path}` });
	await waitForHydration(page);
}

async function gql(page: Page, query: string, variables: Record<string, unknown>) {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return (await res.json())?.data;
}

test('the content lead puts a page into the guide and publishes it with the sidebar', async ({
	page
}) => {
	await openAsContentLead(page);
	const tree = page.getByTestId('guide-tree');
	await expect(tree.getByRole('link', { name: /Workspace start/ })).toBeVisible({
		timeout: 15_000
	});

	const outside = page.getByTestId('guide-tree-outside');
	const loose = outside.getByTestId('guide-tree-row').filter({ hasText: 'Workspace loose page' });
	await loose.locator('summary').click();
	await loose.getByRole('button', { name: 'Start', exact: true }).click();

	// out of the bin (which keeps the series' shared pages), into the section
	await expect(loose).toHaveCount(0);
	const start = tree.getByTestId('guide-tree-section').filter({ hasText: 'Start' });
	await expect(start.getByRole('link', { name: /Workspace loose page/ })).toBeVisible();

	await page.getByTestId('guide-publish-changes').click();
	const dialog = page.getByTestId('guide-publish-changes-dialog');
	await expect(dialog.getByText('Workspace loose page')).toBeVisible();
	await page
		.locator('.modal-open, dialog[open]')
		.getByRole('button', { name: /^(veröffentlichen|publish)$/i })
		.click();

	await expect
		.poll(async () => {
			const data = await gql(
				page,
				`query ($c: ID!, $p: ID!) {
					guideOutlineOf(conferenceId: $c) { published }
					guidePage(id: $p) { publishedVersionId }
				}`,
				{ c: w.conference, p: w.pages.loose }
			);
			return {
				named: JSON.stringify(data?.guideOutlineOf?.published ?? null).includes(w.pages.loose),
				published: Boolean(data?.guidePage?.publishedVersionId)
			};
		})
		.toEqual({ named: true, published: true });
});

test('a page opens in the editor beside the tree', async ({ page }) => {
	await openAsContentLead(page);
	await page
		.getByTestId('guide-tree')
		.getByRole('link', { name: /Workspace start/ })
		.click();
	await expect(page).toHaveURL(new RegExp(`/team/guide/page/${w.pages.start}`));
	await expect(page.getByTestId('guide-tree')).toBeVisible();
	await expect(page.getByTestId('guide-page-entry')).toContainText('Start');
});

test('the visibility tab shows each group of readers its own sidebar', async ({ page }) => {
	await openAsContentLead(page, '/visibility');
	const sidebar = page.getByTestId('guide-reader-sidebar');
	// delegates (the first group) see their committee's section from the template
	await expect(sidebar.getByRole('heading', { name: 'Workspace Committee' })).toBeVisible({
		timeout: 15_000
	});
	await expect(sidebar.getByRole('link', { name: /Workspace start/ })).toBeVisible();

	await page
		.locator('[data-tour="team.guideVisibility.readers"]')
		.getByRole('button', { name: /^(NA-Vertreter\*innen|Non-state actors)$/ })
		.click();
	await expect(sidebar.getByRole('heading', { name: 'Workspace Committee' })).toHaveCount(0);
	await expect(sidebar.getByRole('link', { name: /Workspace start/ })).toBeVisible();
	await expect(page.getByTestId('guide-visibility-table')).toContainText('Start');
});

test('the committee matrix creates a missing agenda item page', async ({ page }) => {
	await openAsContentLead(page, '/committees');
	const matrix = page.getByTestId('guide-committee-matrix');
	await expect(matrix).toContainText('WC', { timeout: 15_000 });
	await matrix.getByRole('button', { name: /Workspace Topic 2/ }).click();
	await expect(page).toHaveURL(/\/team\/guide\/page\//);
	await expect(page.locator('input.input-lg')).toHaveValue('Workspace Topic 2');
});
