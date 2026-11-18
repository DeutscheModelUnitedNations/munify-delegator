import type { Browser } from '@playwright/test';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { paperNotificationsFixture as fixture } from '../seed/paperNotifications';

// A paper handed in on an agenda item tells the committee's chairs and consultants on the paper
// team right away (`announcePaperSubmission`): a PAPER_SUBMITTED mail each, logged as sent by hand
// without a sender, and a Slack message (no workspace here, so only the mails show). Each
// submitted version tells again, a draft never. The specs build on each other's paper, so they
// run in order. Mails are matched to the version they are about (`subjectKey`), so a retry, which
// runs the group again on the same database, finds only its own.
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
const VERSIONS = `query ($id: ID!) { paper(id: $id) { versions { id version } } }`;
const LOG = `query ($c: ID!) {
	emailLogs(where: { conferenceId: { eq: $c }, kind: PAPER_SUBMITTED }) {
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

/** The mails about one version. */
const mailsAbout = async (versionId: string) =>
	(await paperMails(carePage)).filter((row) => row.subjectKey === versionId);

/** The id of the paper's newest version, as its author reads it. */
async function newestVersion(page: Page, paperId: string) {
	type Versions = { paper: { versions: { id: string; version: number }[] } };
	const result = await gql<Versions>(page, VERSIONS, { id: paperId });
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	const versions = result.data?.paper.versions ?? [];
	const newest = versions.toSorted((a, b) => b.version - a.version)[0];
	expect(newest, JSON.stringify(result)).toBeDefined();
	return newest?.id ?? '';
}

/** Saves the paper again with `status`; answers the version it wrote. */
async function save(status: 'DRAFT' | 'SUBMITTED', text: string) {
	const saved = await gql(author, UPDATE, { id: paperId, content: content(text), status });
	expect(saved.errors, JSON.stringify(saved)).toBeUndefined();
	return newestVersion(author, paperId);
}

/** The mails go out in the background: give a draft the time a submission's would take. */
const settle = () => carePage.waitForTimeout(3_000);

const { chair, consultant, care } = fixture.team;
const told = [chair.id, consultant.id].sort();

let author: Page;
let carePage: Page;
let paperId: string;
let draftVersionId: string;

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
	draftVersionId = await newestVersion(author, paperId);

	await settle();
	expect(await mailsAbout(draftVersionId)).toEqual([]);
});

test("submitting tells the committee's chairs and consultants on the paper team, without a sender", async () => {
	const submitted = await save('SUBMITTED', 'The submitted committee notification paper.');

	// not the member chairing the GV, not the SR's chair, not who switched the mail off
	await expect
		.poll(async () => recipientsOf(await mailsAbout(submitted)), { timeout: 20_000 })
		.toEqual(told);
	const rows = await mailsAbout(submitted);
	expect(rows).toHaveLength(2);
	expect(rows.every((row) => row.trigger === 'MANUAL' && row.sentById === null)).toBe(true);
	// the draft before it still told nobody
	expect(await mailsAbout(draftVersionId)).toEqual([]);
});

test('each further submitted version tells again, a draft save does not', async () => {
	const draft = await save('DRAFT', 'A second draft.');
	await settle();
	expect(await mailsAbout(draft)).toEqual([]);

	const resubmitted = await save('SUBMITTED', 'The resubmitted committee notification paper.');
	await expect
		.poll(async () => recipientsOf(await mailsAbout(resubmitted)), { timeout: 20_000 })
		.toEqual(told);
	expect(await mailsAbout(resubmitted)).toHaveLength(2);
});

test("a paper in another committee tells that committee's chair", async ({ browser }) => {
	const srAuthor = await signedIn(browser, fixture.srAuthor.id);
	const created = await gql<{ createPaper: { id: string } }>(srAuthor, CREATE, {
		d: fixture.delegationId,
		i: fixture.srAgendaItemId,
		content: content('A paper for the Sicherheitsrat.'),
		status: 'SUBMITTED'
	});
	expect(created.errors, JSON.stringify(created)).toBeUndefined();
	const version = await newestVersion(srAuthor, created.data?.createPaper.id ?? '');
	await expect
		.poll(async () => recipientsOf(await mailsAbout(version)), { timeout: 20_000 })
		.toEqual([fixture.team.srChair.id]);
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
