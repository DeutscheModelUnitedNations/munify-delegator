import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_GUIDE, E2E_GUIDE_TEXT } from '../seed/guide';

// The preparation guide (src/api/handlers/guidePage/, guideOutline/, docs/plans/guide.md): pages
// are written by `editGuide` (project management, content lead) of a conference they reach, shared
// scopes reach only conferences of a series, and readers get their part of the published sidebar
// through `myGuide`, once the guide is published and the roles are released.

type GraphQLResult = {
	data?: Record<string, unknown> | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const codeOf = (result: GraphQLResult) => result.errors?.[0]?.extensions?.code;

async function signedIn(browser: import('@playwright/test').Browser, id: string) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id));
	return page;
}

const g = E2E_GUIDE;

const MY_GUIDE = `query ($c: ID!, $previewAs: GuidePreviewAudience) {
	myGuide(conferenceId: $c, previewAs: $previewAs) {
		preview
		sections { key title entries { key pageId title } }
	}
}`;

const READER_PAGE = `query ($c: ID!, $p: ID!) {
	guideReaderPage(conferenceId: $c, pageId: $p) { title content previous { pageId } next { pageId } }
}`;

const CREATE = `mutation ($c: ID!, $title: String!, $scope: GuideScopeKind!, $markdown: String) {
	createGuidePage(conferenceId: $c, title: $title, scope: $scope, markdown: $markdown) { id scope }
}`;

const UPDATE = `mutation ($id: ID!, $title: String) {
	updateGuidePageDraft(id: $id, title: $title) { id title }
}`;

const LIBRARY = `query ($c: ID!) { guideLibrary(conferenceId: $c) { id } }`;

test.describe('guide pages', () => {
	test('the content lead creates pages, a reviewer may not', async ({ browser }) => {
		const lead = await signedIn(browser, g.people.contentLeadA);
		const created = await gql(lead, CREATE, {
			c: g.conferenceA,
			title: 'E2E created by the lead',
			scope: 'SERIES',
			markdown: '## Hallo\n\nText'
		});
		expect(created.errors, JSON.stringify(created)).toBeUndefined();
		expect((created.data?.createGuidePage as { scope: string }).scope).toBe('SERIES');

		const reviewer = await signedIn(browser, g.people.reviewerA);
		const refused = await gql(reviewer, CREATE, {
			c: g.conferenceA,
			title: 'E2E created by a reviewer',
			scope: 'CONFERENCE'
		});
		expect(codeOf(refused), JSON.stringify(refused)).toBe('FORBIDDEN');
		expect(codeOf(await gql(reviewer, LIBRARY, { c: g.conferenceA }))).toBe('FORBIDDEN');
	});

	test('a shared page is edited by the guide team of every conference it reaches', async ({
		browser
	}) => {
		const leadB = await signedIn(browser, g.people.contentLeadB);
		const library = await gql(leadB, LIBRARY, { c: g.conferenceB });
		const ids = (library.data?.guideLibrary as { id: string }[]).map((page) => page.id);
		expect(ids).toContain(g.pages.everywhere);
		expect(ids).not.toContain(g.pages.own);

		const renamed = await gql(leadB, UPDATE, {
			id: g.pages.everywhere,
			title: 'Shared everywhere'
		});
		expect(renamed.errors, JSON.stringify(renamed)).toBeUndefined();
		const refused = await gql(leadB, UPDATE, { id: g.pages.own, title: 'Taken over' });
		expect(codeOf(refused)).toBe('NOT_FOUND');
	});

	test('shared pages never reach a conference without a series', async ({ browser }) => {
		const leadC = await signedIn(browser, g.people.contentLeadC);
		const library = await gql(leadC, LIBRARY, { c: g.conferenceC });
		expect(library.data?.guideLibrary).toEqual([]);
		expect(codeOf(await gql(leadC, UPDATE, { id: g.pages.everywhere, title: 'x' }))).toBe(
			'NOT_FOUND'
		);
		const shared = await gql(leadC, CREATE, {
			c: g.conferenceC,
			title: 'E2E created without a series',
			scope: 'EVERYWHERE'
		});
		expect(codeOf(shared)).toBe('INVALID_INPUT');
	});
});

test.describe('reading the guide', () => {
	test('a delegate reads their committee and what is for everyone', async ({ browser }) => {
		const delegate = await signedIn(browser, g.people.delegateA);
		const result = await gql(delegate, MY_GUIDE, { c: g.conferenceA });
		expect(result.errors, JSON.stringify(result)).toBeUndefined();
		const guide = result.data?.myGuide as {
			preview: boolean;
			sections: { title: string; entries: { pageId: string }[] }[];
		};
		expect(guide.preview).toBe(false);
		expect(guide.sections.map((section) => section.title)).toEqual(['Start', 'Guide Committee']);

		const page = await gql(delegate, READER_PAGE, { c: g.conferenceA, p: g.pages.committee });
		const read = page.data?.guideReaderPage as {
			content: { content: { content: { text: string }[] }[] };
			previous: { pageId: string } | null;
		};
		// placeholders filled for the reader
		expect(read.content.content[0].content[0].text).toBe(
			E2E_GUIDE_TEXT.replace('{{Konferenz}}', 'E2E Guide A').replace(
				'{{Gremium}}',
				'Guide Committee'
			)
		);
		expect(read.previous?.pageId).toBe(g.pages.everywhere);

		// the NSA section and pages in no sidebar are not theirs
		for (const pageId of [g.pages.own, g.pages.hidden]) {
			const other = await gql(delegate, READER_PAGE, { c: g.conferenceA, p: pageId });
			expect(other.data?.guideReaderPage).toBeNull();
		}
	});

	test('the guide stays open while the delegate moves through its pages', async ({ browser }) => {
		// a live update once linked the keyless guide to null in the cache: the next page read
		// "not yet available" until a reload (src/lib/api/cacheUpdates.ts)
		const delegate = await signedIn(browser, g.people.delegateA);
		await delegate.goto(`/dashboard/${g.conferenceA}/guide`);
		const links = delegate.locator('aside').getByTestId('guide-sidebar').getByRole('link');
		await expect(links.first()).toBeVisible();
		await links.nth(1).click();
		await expect(delegate).toHaveURL(new RegExp(`/guide/${g.pages.committee}`));
		await expect(delegate.getByTestId('guide-page')).toBeVisible();
		await links.first().click();
		await expect(delegate).toHaveURL(new RegExp(`/guide/${g.pages.everywhere}`));
		await expect(delegate.getByTestId('guide-page')).toBeVisible();
	});

	test('only the team previews another reader', async ({ browser }) => {
		const delegate = await signedIn(browser, g.people.delegateA);
		const refused = await gql(delegate, MY_GUIDE, { c: g.conferenceA, previewAs: 'SUPERVISOR' });
		expect(codeOf(refused)).toBe('FORBIDDEN');

		const reviewer = await signedIn(browser, g.people.reviewerA);
		const preview = await gql(reviewer, MY_GUIDE, {
			c: g.conferenceA,
			previewAs: 'NON_STATE_ACTOR'
		});
		const sections = (
			preview.data?.myGuide as { sections: { title: string; entries: { pageId: string }[] }[] }
		).sections;
		// non-state actors get every committee's topics in the overview, not a committee section
		expect(sections.map((section) => section.title)).toEqual(['Start', 'For NSAs', 'All topics']);
		expect(sections[2].entries.map((entry) => entry.pageId)).toEqual([g.pages.committee]);

		// supervisors keep the committee sections and get the overview only when it names them
		const supervisor = await gql(reviewer, MY_GUIDE, { c: g.conferenceA, previewAs: 'SUPERVISOR' });
		const supervisorTitles = (
			supervisor.data?.myGuide as { sections: { title: string }[] }
		).sections.map((section) => section.title);
		expect(supervisorTitles).toContain('Guide Committee');
		expect(supervisorTitles).not.toContain('All topics');
	});

	test('a conference that has not published its guide shows readers nothing', async ({
		browser
	}) => {
		const leadB = await signedIn(browser, g.people.contentLeadB);
		// the team always reads it (preview), even before
		const team = await gql(leadB, MY_GUIDE, { c: g.conferenceB });
		expect((team.data?.myGuide as { preview: boolean } | null)?.preview).toBe(false);

		const delegate = await signedIn(browser, g.people.delegateA);
		const other = await gql(delegate, MY_GUIDE, { c: g.conferenceB });
		expect(other.data?.myGuide).toBeNull();
	});
});
