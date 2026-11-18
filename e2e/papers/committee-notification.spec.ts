import type { Browser } from '@playwright/test';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { paperNotificationsFixture as fixture } from '../seed/paperNotifications';

// A paper handed in on an agenda item tells the committee's chairs and consultants on the paper
// team right away (`announcePaperSubmission`): a PAPER_SUBMITTED mail each, logged as sent by hand
// without a sender, and a Slack message (no workspace here, so only the mails show). Each
// submitted version tells again, a draft never. The specs build on each other's papers, so they
// run in order (the fixture, e2e/seed/paperNotifications.ts, starts every run without any).
test.describe.configure({ mode: 'serial', timeout: 90_000 });

type GraphQLResult<T = Record<string, unknown>> = {
	data?: T | null;
	errors?: { message: string }[];
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

async function signedIn(browser: Browser, id: string) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)));
	return page;
}

const content = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

const CREATE = `mutation ($d: ID!, $i: ID!, $content: JSON!, $status: PaperstatusEnum!) {
	createPaper(delegationId: $d, agendaItemId: $i, type: POSITION_PAPER, content: $content, status: $status) { id }
}`;
const UPDATE = `mutation ($id: ID!, $content: JSON!, $status: PaperstatusEnum) {
	updatePaper(paperId: $id, content: $content, status: $status) { id }
}`;
const LOG = `query ($c: ID!) {
	emailLogs(where: { conferenceId: { eq: $c }, kind: { eq: PAPER_SUBMITTED } }) {
		userId subjectKey trigger sentById
	}
}`;

type LogRow = { userId: string; subjectKey: string; trigger: string; sentById: string | null };

/** The paper mails of the conference, as participant care reads the log. */
async function paperMails(page: Page) {
	const result = await gql<{ emailLogs: LogRow[] }>(page, LOG, { c: fixture.conferenceId });
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return result.data?.emailLogs ?? [];
}

const recipientsOf = (rows: LogRow[]) => [...new Set(rows.map((row) => row.userId))].sort();

const { chair, consultant, care } = fixture.team;
const told = [chair.id, consultant.id].sort();

let author: Page;
let carePage: Page;
let paperId: string;

test.beforeAll(async ({ browser }) => {
	author = await signedIn(browser, fixture.author.id);
	carePage = await signedIn(browser, care.id);
});

test('a draft tells nobody', async () => {
	const created = await gql<{ createPaper: { id: string } }>(author, CREATE, {
		d: fixture.delegationId,
		i: fixture.gvAgendaItemId,
		content: content('A draft of the committee notification paper.'),
		status: 'DRAFT'
	});
	expect(created.errors, JSON.stringify(created)).toBeUndefined();
	paperId = created.data?.createPaper.id ?? '';
	expect(paperId).not.toBe('');

	// the mails go out in the background: give them the time a submission's would take
	await author.waitForTimeout(3_000);
	expect(await paperMails(carePage)).toEqual([]);
});

test("submitting tells the committee's chairs and consultants on the paper team, without a sender", async () => {
	const submitted = await gql(author, UPDATE, {
		id: paperId,
		content: content('The submitted committee notification paper.'),
		status: 'SUBMITTED'
	});
	expect(submitted.errors, JSON.stringify(submitted)).toBeUndefined();

	// not the member chairing the GV, not the SR's chair, not who switched the mail off
	await expect
		.poll(async () => recipientsOf(await paperMails(carePage)), { timeout: 20_000 })
		.toEqual(told);
	const rows = await paperMails(carePage);
	expect(rows).toHaveLength(2);
	expect(rows.every((row) => row.trigger === 'MANUAL' && row.sentById === null)).toBe(true);
	// one version, named by its id
	expect(new Set(rows.map((row) => row.subjectKey)).size).toBe(1);
});

test('each further submitted version tells again, a draft save does not', async () => {
	const draft = await gql(author, UPDATE, {
		id: paperId,
		content: content('A second draft.'),
		status: 'DRAFT'
	});
	expect(draft.errors, JSON.stringify(draft)).toBeUndefined();
	await author.waitForTimeout(3_000);
	expect(await paperMails(carePage)).toHaveLength(2);

	const resubmitted = await gql(author, UPDATE, {
		id: paperId,
		content: content('The resubmitted committee notification paper.'),
		status: 'SUBMITTED'
	});
	expect(resubmitted.errors, JSON.stringify(resubmitted)).toBeUndefined();
	await expect.poll(async () => (await paperMails(carePage)).length, { timeout: 20_000 }).toBe(4);
	const rows = await paperMails(carePage);
	expect(new Set(rows.map((row) => row.subjectKey)).size).toBe(2);
	expect(recipientsOf(rows)).toEqual(told);
});

test("a paper in another committee tells that committee's chair", async ({ browser }) => {
	const srAuthor = await signedIn(browser, fixture.srAuthor.id);
	const created = await gql(srAuthor, CREATE, {
		d: fixture.delegationId,
		i: fixture.srAgendaItemId,
		content: content('A paper for the Sicherheitsrat.'),
		status: 'SUBMITTED'
	});
	expect(created.errors, JSON.stringify(created)).toBeUndefined();
	await expect.poll(async () => (await paperMails(carePage)).length, { timeout: 20_000 }).toBe(5);
	const rows = await paperMails(carePage);
	expect(rows.filter((row) => row.userId === fixture.team.srChair.id)).toHaveLength(1);
	expect(rows.filter((row) => told.includes(row.userId))).toHaveLength(4);
});

test('the notification settings offer the papers to chairs and consultants on the paper team only', async ({
	browser
}) => {
	const SETTINGS = `{ myNotificationSettings { conferenceId settings { topic teamFunctionId } } }`;
	type Settings = {
		myNotificationSettings: {
			conferenceId: string;
			settings: { topic: string; teamFunctionId: string | null }[];
		}[];
	};
	const papersOf = async (id: string) => {
		const page = await signedIn(browser, id);
		const result = await gql<Settings>(page, SETTINGS);
		expect(result.errors, JSON.stringify(result)).toBeUndefined();
		return (
			result.data?.myNotificationSettings
				.find((entry) => entry.conferenceId === fixture.conferenceId)
				?.settings.filter((line) => line.topic === 'COMMITTEE_PAPERS') ?? []
		);
	};

	expect(await papersOf(chair.id)).toEqual([
		{ topic: 'COMMITTEE_PAPERS', teamFunctionId: fixture.functionIds.chair }
	]);
	expect(await papersOf(fixture.team.member.id)).toEqual([]);

	const page = await signedIn(browser, chair.id);
	await page.goto('/my-account/notifications');
	await expect(
		page.locator(
			`[data-testid="notification-row"][data-topic="COMMITTEE_PAPERS:${fixture.functionIds.chair}"]`
		)
	).toBeVisible({ timeout: 15_000 });
});
