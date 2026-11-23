import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_GUIDE } from '../seed/guide';

// The guide sidebar change by change (src/api/handlers/guideOutline/guideOutlineTools.ts), as the
// MCP tools call it: `editGuide` of the conference only, pages and roles of that conference only,
// and a change naming the draft it saw (`expectedDraftUpdatedAt`) is refused once it moved on.
// Works on C, whose sidebar no other spec uses.

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

type Change = { sectionId: string | null; draftUpdatedAt: string; draft: unknown };

const ADD_SECTION = `mutation ($c: ID!, $title: String!, $audience: GuideAudienceInput, $e: DateTime) {
	addGuideSection(conferenceId: $c, title: $title, audience: $audience, expectedDraftUpdatedAt: $e) {
		sectionId draftUpdatedAt draft
	}
}`;

const UPDATE_SECTION = `mutation ($c: ID!, $s: ID!, $title: String, $e: DateTime) {
	updateGuideSection(conferenceId: $c, sectionId: $s, title: $title, expectedDraftUpdatedAt: $e) {
		draftUpdatedAt
	}
}`;

const ADD_ENTRY = `mutation ($c: ID!, $s: ID!, $p: ID!, $audience: GuideAudienceInput) {
	addGuideEntry(conferenceId: $c, sectionId: $s, pageId: $p, audience: $audience) {
		draftUpdatedAt draft
	}
}`;

const CREATE_PAGE = `mutation ($c: ID!, $title: String!) {
	createGuidePage(conferenceId: $c, title: $title, scope: CONFERENCE) { id }
}`;

async function addSection(page: Page, title: string) {
	const result = await gql(page, ADD_SECTION, { c: g.conferenceC, title });
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return result.data?.addGuideSection as Change;
}

test('the content lead changes the sidebar step by step; a reviewer may not', async ({
	browser
}) => {
	const lead = await signedIn(browser, g.people.contentLeadC);
	const section = await addSection(lead, 'E2E step by step');
	expect(section.sectionId).toBeTruthy();

	const created = await gql(lead, CREATE_PAGE, { c: g.conferenceC, title: 'E2E created for C' });
	const pageId = (created.data?.createGuidePage as { id: string }).id;
	const entry = await gql(lead, ADD_ENTRY, { c: g.conferenceC, s: section.sectionId, p: pageId });
	expect(entry.errors, JSON.stringify(entry)).toBeUndefined();
	expect(JSON.stringify((entry.data?.addGuideEntry as Change).draft)).toContain(pageId);

	const pending = await gql(
		lead,
		`query ($c: ID!) { guidePendingChanges(conferenceId: $c) { sidebarChanged pages { id } } }`,
		{ c: g.conferenceC }
	);
	expect(pending.data?.guidePendingChanges).toMatchObject({
		sidebarChanged: true,
		pages: expect.arrayContaining([{ id: pageId }])
	});

	// the reviewer of another conference's team, and in their own conference without editGuide
	const reviewer = await signedIn(browser, g.people.reviewerA);
	for (const conferenceId of [g.conferenceA, g.conferenceC]) {
		const refused = await gql(reviewer, ADD_SECTION, { c: conferenceId, title: 'Not mine' });
		expect(codeOf(refused), JSON.stringify(refused)).toBe('FORBIDDEN');
	}
	const views = await gql(
		reviewer,
		`query ($c: ID!) { guideVisibility(conferenceId: $c) { rows { key } } }`,
		{ c: g.conferenceA }
	);
	expect(codeOf(views)).toBe('FORBIDDEN');
});

test('pages and roles of another conference are refused', async ({ browser }) => {
	const lead = await signedIn(browser, g.people.contentLeadC);
	const section = await addSection(lead, 'E2E strangers');

	// a page of D, which does not reach C
	const page = await gql(lead, ADD_ENTRY, {
		c: g.conferenceC,
		s: section.sectionId,
		p: g.workspace.pages.start
	});
	expect(codeOf(page), JSON.stringify(page)).toBe('INVALID_INPUT');

	const role = await gql(lead, ADD_SECTION, {
		c: g.conferenceC,
		title: 'E2E for a stranger role',
		audience: { type: 'customRoles', roleIds: ['e2e-not-a-role-of-c'] }
	});
	expect(codeOf(role), JSON.stringify(role)).toBe('INVALID_INPUT');

	// a section that is not there
	const missing = await gql(lead, UPDATE_SECTION, {
		c: g.conferenceC,
		s: 'e2e-no-such-section',
		title: 'x'
	});
	expect(codeOf(missing)).toBe('NOT_FOUND');
});

test('a change naming a draft that moved on since is refused', async ({ browser }) => {
	const lead = await signedIn(browser, g.people.contentLeadC);
	const first = await addSection(lead, 'E2E seen');

	// someone else changes the draft in between
	const other = await addSection(lead, 'E2E meanwhile');
	expect(new Date(other.draftUpdatedAt).getTime()).toBeGreaterThan(
		new Date(first.draftUpdatedAt).getTime()
	);

	const stale = await gql(lead, UPDATE_SECTION, {
		c: g.conferenceC,
		s: first.sectionId,
		title: 'E2E renamed',
		e: first.draftUpdatedAt
	});
	expect(codeOf(stale), JSON.stringify(stale)).toBe('CONFLICT');

	const fresh = await gql(lead, UPDATE_SECTION, {
		c: g.conferenceC,
		s: first.sectionId,
		title: 'E2E renamed',
		e: other.draftUpdatedAt
	});
	expect(fresh.errors, JSON.stringify(fresh)).toBeUndefined();

	// the whole-outline write checks the same way
	const whole = await gql(
		lead,
		`mutation ($c: ID!, $o: JSON!, $e: DateTime) {
			updateGuideOutlineDraft(conferenceId: $c, outline: $o, expectedDraftUpdatedAt: $e) { draftUpdatedAt }
		}`,
		{ c: g.conferenceC, o: { sections: [] }, e: other.draftUpdatedAt }
	);
	expect(codeOf(whole), JSON.stringify(whole)).toBe('CONFLICT');
});
