import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_CONFERENCE_ID,
	E2E_MGMT_ADMIN_ID,
	E2E_PAPER_REVIEWER_ID,
	E2E_TEAM_COORDINATOR_ID
} from '../seed/seed';

// Saved views of the team's tables (`src/api/handlers/tableView/`): personal views are their
// owner's alone, shared views are read by the conference's team and changed by `manageTableViews`
// (project management and participant care), global shared views by system admins; and the tables
// themselves (`dataTablePage`) answer only whoever may open their page.

type GraphQLResult = {
	data?: Record<string, unknown> | null;
	errors?: { message: string }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

function expectRefused(result: GraphQLResult, reason: RegExp) {
	expect(result.errors?.[0]?.message, JSON.stringify(result)).toMatch(reason);
}

const state = {
	v: 1,
	visibility: {},
	order: [],
	sizes: {},
	sorting: [{ id: 'family_name', desc: false }],
	filter: { type: 'group', op: 'and', items: [] },
	grouping: [{ column: 'role' }],
	groups: { collapsed: false, toggled: [] },
	pageSize: 20
};

const CREATE = `mutation ($c: ID!, $name: String!, $state: JSON!, $shared: Boolean!, $global: Boolean) {
	createTableView(tableKey: "participants", conferenceId: $c, name: $name, state: $state, shared: $shared, global: $global) { id }
}`;

const LIST = `query ($c: ID!) {
	tableViews(where: { tableKey: { eq: "participants" }, conferenceId: { eq: $c } }) { id name }
}`;

async function signedIn(browser: import('@playwright/test').Browser, id: string) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id));
	return page;
}

async function create(
	page: Page,
	{ name, shared, global = false }: { name: string; shared: boolean; global?: boolean }
) {
	return gql(page, CREATE, { c: E2E_CONFERENCE_ID, name, state, shared, global });
}

const listed = async (page: Page) =>
	((await gql(page, LIST, { c: E2E_CONFERENCE_ID })).data?.tableViews as { id: string }[]).map(
		(view) => view.id
	);

test('a personal view is its owner’s alone', async ({ browser }) => {
	const care = await signedIn(browser, E2E_MGMT_ADMIN_ID);
	const pm = await signedIn(browser, E2E_ASSIGNMENT_ADMIN_ID);
	const name = `e2e personal ${Date.now()}`;
	const created = await create(care, { name, shared: false });
	expect(created.errors, JSON.stringify(created)).toBeUndefined();
	const id = (created.data?.createTableView as { id: string }).id;

	expect(await listed(care)).toContain(id);
	expect(await listed(pm)).not.toContain(id);
	expectRefused(
		await gql(pm, `mutation ($id: ID!) { updateTableView(id: $id, name: "taken") { id } }`, { id }),
		/not found/i
	);
	expectRefused(
		await gql(pm, `mutation ($id: ID!) { deleteTableView(id: $id) }`, { id }),
		/not found/i
	);
	// Nobody else picks it as their default either: they cannot read it.
	expectRefused(
		await gql(
			pm,
			`mutation ($c: ID!, $v: ID!) { setMyTableViewDefault(tableKey: "participants", conferenceId: $c, viewId: $v) }`,
			{ c: E2E_CONFERENCE_ID, v: id }
		),
		/not exist/i
	);

	const deleted = await gql(care, `mutation ($id: ID!) { deleteTableView(id: $id) }`, { id });
	expect(deleted.errors, JSON.stringify(deleted)).toBeUndefined();
});

test('a shared view is read by the team and changed by those who manage views', async ({
	browser
}) => {
	const care = await signedIn(browser, E2E_MGMT_ADMIN_ID);
	const pm = await signedIn(browser, E2E_ASSIGNMENT_ADMIN_ID);
	const reviewer = await signedIn(browser, E2E_PAPER_REVIEWER_ID);
	const name = `e2e shared ${Date.now()}`;

	// The reviewer may not open the participants table, let alone save a view of it.
	expectRefused(await create(reviewer, { name, shared: true }), /access denied/i);
	// Participant care may not save a shared view for every conference: system admins only.
	expectRefused(await create(care, { name, shared: true, global: true }), /system administrators/i);

	const created = await create(care, { name, shared: true });
	expect(created.errors, JSON.stringify(created)).toBeUndefined();
	const id = (created.data?.createTableView as { id: string }).id;

	// The whole team reads it, the reviewer included.
	expect(await listed(pm)).toContain(id);
	expect(await listed(reviewer)).toContain(id);
	// Project management changes it, the reviewer does not.
	const renamed = await gql(
		pm,
		`mutation ($id: ID!) { updateTableView(id: $id, name: "renamed by pm") { name } }`,
		{ id }
	);
	expect(renamed.errors, JSON.stringify(renamed)).toBeUndefined();
	expectRefused(
		await gql(reviewer, `mutation ($id: ID!) { deleteTableView(id: $id) }`, { id }),
		/not found/i
	);
	expectRefused(
		await gql(
			reviewer,
			`mutation ($id: ID!) { setTableViewDefault(id: $id, isDefault: true) { id } }`,
			{
				id
			}
		),
		/not found/i
	);

	const deleted = await gql(pm, `mutation ($id: ID!) { deleteTableView(id: $id) }`, { id });
	expect(deleted.errors, JSON.stringify(deleted)).toBeUndefined();
});

test('the team coordinator keeps personal views of the team table, but shares none', async ({
	browser
}) => {
	const coordinator = await signedIn(browser, E2E_TEAM_COORDINATOR_ID);
	const createTeamView = (shared: boolean) =>
		gql(
			coordinator,
			`mutation ($c: ID!, $state: JSON!, $shared: Boolean!) {
				createTableView(tableKey: "teamMembers", conferenceId: $c, name: "e2e team", state: $state, shared: $shared) { id }
			}`,
			{ c: E2E_CONFERENCE_ID, state: { ...state, grouping: [] }, shared }
		);
	expectRefused(await createTeamView(true), /access denied/i);
	const personal = await createTeamView(false);
	expect(personal.errors, JSON.stringify(personal)).toBeUndefined();
	const id = (personal.data?.createTableView as { id: string }).id;
	await gql(coordinator, `mutation ($id: ID!) { deleteTableView(id: $id) }`, { id });
});

test('a table answers only whoever may open its page', async ({ browser }) => {
	const reviewer = await signedIn(browser, E2E_PAPER_REVIEWER_ID);
	const coordinator = await signedIn(browser, E2E_TEAM_COORDINATOR_ID);
	const page = (table: string) => `query ($c: ID!, $q: JSON!) {
		dataTablePage(table: "${table}", conferenceId: $c, query: $q, limit: 5, offset: 0) { total }
	}`;
	const query = { filter: state.filter, sorting: [], grouping: [], path: [] };

	expectRefused(
		await gql(reviewer, page('participants'), { c: E2E_CONFERENCE_ID, q: query }),
		/access denied/i
	);
	expectRefused(
		await gql(reviewer, page('teamMembers'), { c: E2E_CONFERENCE_ID, q: query }),
		/access denied/i
	);
	// The team coordinator manages the team, but not the participants.
	const team = await gql(coordinator, page('teamMembers'), { c: E2E_CONFERENCE_ID, q: query });
	expect(team.errors, JSON.stringify(team)).toBeUndefined();
	expectRefused(
		await gql(coordinator, page('participants'), { c: E2E_CONFERENCE_ID, q: query }),
		/access denied/i
	);
	// A query that does not fit is an input error, not a crash.
	expectRefused(
		await gql(coordinator, page('teamMembers'), {
			c: E2E_CONFERENCE_ID,
			q: { ...query, path: ['x'] }
		}),
		/deeper than the table is grouped/i
	);
});
