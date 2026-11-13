import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { announcementsFixture } from '../seed/announcements';

// The announcements (`src/api/handlers/announcement/`): the rows are their editors' (the
// conference's content roles); everybody else reads only their own feed, which holds what is out
// for their part in the conference. A feed never tells a seat before the assignment is released,
// and an audience names only committees of its own conference. The fixture
// (e2e/seed/announcements.ts) starts every run with the same announcements.
// Several people sign in per test, each through the provider once.
test.describe.configure({ mode: 'serial', timeout: 90_000 });

type GraphQLResult<T = Record<string, unknown>> = {
	data?: T | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function gql<T = Record<string, unknown>>(
	page: Page,
	query: string,
	variables: Record<string, unknown> = {}
) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult<T>;
}

const codeOf = (result: GraphQLResult) => result.errors?.[0]?.extensions?.code;

const fixture = announcementsFixture('auth');
const other = announcementsFixture('ui');
const CONFERENCE = fixture.conferenceId;
const { anna, bert, supervisor, outsider, care, reviewer, member } = fixture.people;
const seeded = fixture.announcements;

async function signedIn(browser: import('@playwright/test').Browser, id: string) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)));
	return page;
}

const FEED = `query ($c: ID!) { announcementFeed(conferenceId: $c) { id title read importance } }`;
const ROWS = `query ($c: ID!) {
	announcements(where: { conferenceId: { eq: $c } }) { id title state recipientCount readCount }
}`;
const ROW = `query ($id: ID!) { announcement(id: $id) { id title body } }`;
const CREATE = `mutation ($c: ID!, $title: String!, $audiences: [AnnouncementAudienceInput!]!) {
	createAnnouncement(conferenceId: $c, title: $title, body: "Text", audiences: $audiences) { id state }
}`;
const UPDATE = `mutation ($id: ID!, $title: String) { updateAnnouncement(id: $id, title: $title) { id title } }`;
const PUBLISH = `mutation ($id: ID!, $at: DateTime) { publishAnnouncement(id: $id, publishAt: $at) { id state } }`;
const WITHDRAW = `mutation ($id: ID!) { withdrawAnnouncement(id: $id) { id state } }`;
const DELETE = `mutation ($id: ID!) { deleteAnnouncement(id: $id) }`;
const READ = `mutation ($c: ID!, $ids: [ID!]) { markAnnouncementsRead(conferenceId: $c, ids: $ids) { id read } }`;
const PREVIEW = `query ($c: ID!, $audiences: [AnnouncementAudienceInput!]!) {
	announcementAudiencePreview(conferenceId: $c, audiences: $audiences) { total delegates supervisors team waitingList }
}`;

type FeedRow = { id: string; title: string; read: boolean; importance: string };
type Row = { id: string; title: string; state: string; recipientCount: number; readCount: number };

const feedOf = async (page: Page, conference = CONFERENCE) =>
	(await gql<{ announcementFeed: FeedRow[] }>(page, FEED, { c: conference })).data
		?.announcementFeed ?? [];
const idsOf = (feed: { id: string }[]) => feed.map((item) => item.id).toSorted();
const rowsOf = async (page: Page, conference = CONFERENCE) =>
	(await gql<{ announcements: Row[] }>(page, ROWS, { c: conference })).data?.announcements ?? [];

test('a feed holds what is out for the reader, and nothing else of the conference', async ({
	browser
}) => {
	const annaPage = await signedIn(browser, anna.id);
	expect(idsOf(await feedOf(annaPage))).toEqual([seeded.gv.id, seeded.welcome.id].toSorted());
	expect(idsOf(await feedOf(await signedIn(browser, bert.id)))).toEqual([seeded.welcome.id]);
	expect(idsOf(await feedOf(await signedIn(browser, supervisor.id)))).toEqual(
		[seeded.supervisors.id, seeded.welcome.id].toSorted()
	);
	expect(idsOf(await feedOf(await signedIn(browser, member.id)))).toEqual([seeded.team.id]);
	expect(await feedOf(await signedIn(browser, outsider.id))).toEqual([]);
	// a part in one conference gives nothing in another
	expect(await feedOf(annaPage, other.conferenceId)).toEqual([]);
});

test('a visitor gets an empty feed, not an error, and marks nothing read', async ({ page }) => {
	// the header asks on the public conference pages too
	const feed = await gql<{ announcementFeed: FeedRow[] }>(page, FEED, { c: CONFERENCE });
	expect(feed.errors).toBeUndefined();
	expect(feed.data?.announcementFeed).toEqual([]);
	const read = await gql<{ markAnnouncementsRead: FeedRow[] }>(page, READ, {
		c: CONFERENCE,
		ids: [seeded.welcome.id]
	});
	expect(read.data?.markAnnouncementsRead).toEqual([]);

	// a conference page a visitor opens renders, with nothing of the announcements on it
	const response = await page.goto(`/dashboard/${CONFERENCE}`);
	expect(response?.status()).toBeLessThan(400);
	await expect(page.getByTestId('urgent-announcement-bar')).toBeHidden();
});

test('the rows are the content roles’: participants and the rest of the team read none', async ({
	browser
}) => {
	const carePage = await signedIn(browser, care.id);
	expect((await rowsOf(carePage)).length).toBe(7);
	// participant care of this conference reads nothing of the other one
	expect(await rowsOf(carePage, other.conferenceId)).toEqual([]);

	for (const person of [anna, supervisor, outsider, reviewer, member]) {
		const page = await signedIn(browser, person.id);
		expect(await rowsOf(page), person.id).toEqual([]);
		// not even one in their own feed, and never a draft
		for (const id of [seeded.welcome.id, seeded.draft.id]) {
			const result = await gql<{ announcement: unknown }>(page, ROW, { id });
			expect(result.data?.announcement ?? null, person.id).toBeNull();
		}
	}
});

test('only the content roles write, publish, take back and delete', async ({ browser }) => {
	for (const person of [anna, reviewer, member, outsider]) {
		const page = await signedIn(browser, person.id);
		const created = await gql(page, CREATE, {
			c: CONFERENCE,
			title: 'Nope',
			audiences: [{ kind: 'EVERYONE' }]
		});
		expect(codeOf(created), person.id).toBe('FORBIDDEN');
		for (const mutation of [UPDATE, PUBLISH, WITHDRAW, DELETE]) {
			const result = await gql(page, mutation, { id: seeded.draft.id, title: 'Hijacked' });
			expect(codeOf(result), `${person.id} ${mutation.slice(0, 30)}`).toBe('NOT_FOUND');
		}
		const preview = await gql(page, PREVIEW, { c: CONFERENCE, audiences: [{ kind: 'EVERYONE' }] });
		expect(codeOf(preview), person.id).toBe('FORBIDDEN');
	}
	const carePage = await signedIn(browser, care.id);
	expect((await rowsOf(carePage)).find((row) => row.id === seeded.draft.id)?.title).toBe(
		seeded.draft.title
	);
});

test('an announcement needs an audience, and one of its own conference', async ({ browser }) => {
	const carePage = await signedIn(browser, care.id);
	const create = (audiences: unknown[]) =>
		gql<{ createAnnouncement: { id: string; state: string } }>(carePage, CREATE, {
			c: CONFERENCE,
			title: 'Audience check',
			audiences
		});

	expect(codeOf(await create([]))).toBe('INVALID_INPUT');
	// a committee has to be named
	expect(codeOf(await create([{ kind: 'COMMITTEE' }]))).toBe('INVALID_INPUT');
	// and be this conference's
	expect(codeOf(await create([{ kind: 'COMMITTEE', committeeId: other.gvId }]))).toBe(
		'INVALID_INPUT'
	);

	const created = await create([{ kind: 'COMMITTEE', committeeId: fixture.srId }]);
	expect(created.data?.createAnnouncement.state).toBe('DRAFT');
	// a draft reaches nobody
	const bertPage = await signedIn(browser, bert.id);
	expect(idsOf(await feedOf(bertPage))).toEqual([seeded.welcome.id]);

	const id = created.data?.createAnnouncement.id ?? '';
	const published = await gql<{ publishAnnouncement: { state: string } }>(carePage, PUBLISH, {
		id
	});
	expect(published.data?.publishAnnouncement.state).toBe('PUBLISHED');
	expect(idsOf(await feedOf(bertPage))).toContain(id);
	// publishing twice is refused
	expect(codeOf(await gql(carePage, PUBLISH, { id }))).toBe('CONFLICT');

	await gql(carePage, DELETE, { id });
	expect(idsOf(await feedOf(bertPage))).toEqual([seeded.welcome.id]);
});

test('the audience count counts each person once and the team apart', async ({ browser }) => {
	const carePage = await signedIn(browser, care.id);
	const preview = async (audiences: unknown[]) =>
		(
			await gql<{ announcementAudiencePreview: Record<string, number> }>(carePage, PREVIEW, {
				c: CONFERENCE,
				audiences
			})
		).data?.announcementAudiencePreview;

	expect(await preview([{ kind: 'EVERYONE' }])).toEqual({
		total: 5,
		delegates: 3,
		supervisors: 1,
		team: 0,
		waitingList: 1
	});
	// Anna and Carla sit in GV and are delegates: counted once
	expect(
		(await preview([{ kind: 'DELEGATES' }, { kind: 'COMMITTEE', committeeId: fixture.gvId }]))
			?.total
	).toBe(3);
	expect((await preview([{ kind: 'TEAM' }]))?.team).toBe(3);
	expect((await preview([{ kind: 'TEAM', teamRole: 'REVIEWER' }]))?.total).toBe(1);
	expect((await preview([{ kind: 'WAITING_LIST' }]))?.total).toBe(1);
});

test('reading counts only for what is in the reader’s own feed', async ({ browser }) => {
	const bertPage = await signedIn(browser, bert.id);
	// the GV announcement is not Bert's, the draft nobody's
	const result = await gql<{ markAnnouncementsRead: FeedRow[] }>(bertPage, READ, {
		c: CONFERENCE,
		ids: [seeded.gv.id, seeded.draft.id, seeded.welcome.id]
	});
	expect(result.data?.markAnnouncementsRead).toEqual([
		expect.objectContaining({ id: seeded.welcome.id, read: true })
	]);

	const carePage = await signedIn(browser, care.id);
	const rows = await rowsOf(carePage);
	expect(rows.find((row) => row.id === seeded.gv.id)?.readCount).toBe(0);
	expect(rows.find((row) => row.id === seeded.welcome.id)?.readCount).toBe(1);
	expect(rows.find((row) => row.id === seeded.draft.id)?.readCount).toBe(0);
});

test('a committee audience tells nobody their seat before the assignment is released', async ({
	browser
}) => {
	const carePage = await signedIn(browser, care.id);
	const annaPage = await signedIn(browser, anna.id);
	const setReleased = (released: boolean) =>
		gql(
			carePage,
			`mutation ($c: ID!, $released: Boolean!) { setAssignmentReleased(conferenceId: $c, released: $released) }`,
			{ c: CONFERENCE, released }
		);

	expect(idsOf(await feedOf(annaPage))).toContain(seeded.gv.id);
	const hidden = await setReleased(false);
	expect(hidden.errors, JSON.stringify(hidden.errors)).toBeUndefined();
	try {
		// while roles are hidden the committee matches nobody; the announcement for everybody stays
		expect(idsOf(await feedOf(annaPage))).toEqual([seeded.welcome.id]);
		expect((await rowsOf(carePage)).find((row) => row.id === seeded.gv.id)?.recipientCount).toBe(0);
	} finally {
		await setReleased(true);
	}
	expect(idsOf(await feedOf(annaPage))).toContain(seeded.gv.id);
});
