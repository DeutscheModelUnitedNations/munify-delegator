import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { notificationsFixture as fixture } from '../seed/notifications';

// The team's notification settings (`src/api/handlers/notification/`): everybody reads and
// changes only their own, per topic they can be told about (an inbox they answer, and the
// reports for participant care) and channel; the Slack workspaces are the system admins', and
// which one a conference is told in is its project management's. A bot token is no field of the
// API. The specs build on each other's choices, so they run in order (the fixture,
// e2e/seed/notifications.ts, starts every run without any).
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

async function signedIn(browser: import('@playwright/test').Browser, id: string, roles?: string[]) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, { ...fixture.claims(id), ...(roles ? { roles } : {}) }));
	return page;
}

const CONFERENCE = fixture.conferenceId;
const { care, chair, trusted, plain, management, quiet } = fixture.team;

type Setting = { topic: string; teamFunctionId: string | null; email: boolean; slack: boolean };
type Settings = {
	myNotificationSettings: {
		conferenceId: string;
		slackWorkspaceName: string | null;
		settings: Setting[];
	}[];
};
const SETTINGS = `{
	myNotificationSettings {
		conferenceId slackWorkspaceName
		settings { topic teamFunctionId functionKind committeeAbbreviation email slack }
	}
}`;
const SET = `mutation ($c: ID!, $topic: NotificationtopicEnum!, $fn: ID, $channel: NotificationchannelEnum!, $on: Boolean!) {
	setNotificationPreference(conferenceId: $c, topic: $topic, teamFunctionId: $fn, channel: $channel, enabled: $on)
}`;

/** The caller's lines in the fixture's conference. */
async function settingsOf(page: Page) {
	const result = await gql<Settings>(page, SETTINGS);
	expect(result.errors).toBeUndefined();
	return (
		result.data?.myNotificationSettings.find((entry) => entry.conferenceId === CONFERENCE) ?? null
	);
}

const topicsOf = (settings: { settings: Setting[] } | null) =>
	settings?.settings.map((setting) => setting.topic);

test('everybody is offered exactly the topics they can be told about, all on', async ({
	browser
}) => {
	const carePage = await signedIn(browser, care.id);
	const careSettings = await settingsOf(carePage);
	expect(topicsOf(careSettings)).toEqual(['PARTICIPANT_CARE', 'CHAT_REPORT']);
	expect(careSettings?.settings.every((setting) => setting.email && setting.slack)).toBe(true);
	// no workspace picked yet
	expect(careSettings?.slackWorkspaceName).toBeNull();

	const chairSettings = await settingsOf(await signedIn(browser, chair.id));
	expect(chairSettings?.settings).toEqual([
		expect.objectContaining({
			topic: 'COMMITTEE_INBOX',
			teamFunctionId: fixture.chairFunctionId,
			functionKind: 'CHAIR',
			committeeAbbreviation: fixture.gv
		})
	]);

	expect(topicsOf(await settingsOf(await signedIn(browser, trusted.id)))).toEqual([
		'TRUSTED_SHARED',
		'TRUSTED_PERSONAL'
	]);
	// on the team, but answering nothing
	expect(topicsOf(await settingsOf(await signedIn(browser, plain.id)))).toEqual([]);
});

test('mail starts off for whoever switched the unread mails off before, Slack on', async ({
	browser
}) => {
	const settings = await settingsOf(await signedIn(browser, quiet.id));
	expect(settings?.settings.map(({ email, slack }) => ({ email, slack }))).toEqual([
		{ email: false, slack: true },
		{ email: false, slack: true }
	]);
});

test('somebody on no team has no settings, and a visitor none at all', async ({ browser }) => {
	const outsider = await signedIn(browser, fixture.outsiderId);
	expect(await settingsOf(outsider)).toBeNull();
	const refused = await gql(outsider, SET, {
		c: CONFERENCE,
		topic: 'PARTICIPANT_CARE',
		channel: 'EMAIL',
		on: false
	});
	expect(codeOf(refused)).toBe('NOT_FOUND');

	const visitor = await (await browser.newContext()).newPage();
	expect(codeOf(await gql(visitor, SETTINGS))).toBe('UNAUTHENTICATED');
});

test('a choice is stored for the caller alone', async ({ browser }) => {
	const carePage = await signedIn(browser, care.id);
	const saved = await gql(carePage, SET, {
		c: CONFERENCE,
		topic: 'CHAT_REPORT',
		channel: 'SLACK',
		on: false
	});
	expect(saved.errors).toBeUndefined();
	expect((await settingsOf(carePage))?.settings).toEqual([
		expect.objectContaining({ topic: 'PARTICIPANT_CARE', email: true, slack: true }),
		expect.objectContaining({ topic: 'CHAT_REPORT', email: true, slack: false })
	]);
	// project management answers the same inbox and keeps their own choices
	const managementSettings = await settingsOf(await signedIn(browser, management.id));
	expect(managementSettings?.settings.every((setting) => setting.slack)).toBe(true);

	// and back on
	await gql(carePage, SET, { c: CONFERENCE, topic: 'CHAT_REPORT', channel: 'SLACK', on: true });
	expect((await settingsOf(carePage))?.settings.every((setting) => setting.slack)).toBe(true);
});

test('nobody chooses for a topic that is not theirs', async ({ browser }) => {
	const chairPage = await signedIn(browser, chair.id);
	// the participant care inbox is not a chair's
	const notTheirs = await gql(chairPage, SET, {
		c: CONFERENCE,
		topic: 'PARTICIPANT_CARE',
		channel: 'EMAIL',
		on: false
	});
	expect(codeOf(notTheirs)).toBe('INVALID_INPUT');
	// a committee inbox needs the caller's own function
	const carePage = await signedIn(browser, care.id);
	const borrowed = await gql(carePage, SET, {
		c: CONFERENCE,
		topic: 'COMMITTEE_INBOX',
		fn: fixture.chairFunctionId,
		channel: 'EMAIL',
		on: false
	});
	expect(codeOf(borrowed)).toBe('INVALID_INPUT');
	// their own works
	const own = await gql(chairPage, SET, {
		c: CONFERENCE,
		topic: 'COMMITTEE_INBOX',
		fn: fixture.chairFunctionId,
		channel: 'EMAIL',
		on: false
	});
	expect(own.errors).toBeUndefined();
	expect((await settingsOf(chairPage))?.settings[0]).toMatchObject({ email: false, slack: true });
});

const WORKSPACES = `query ($c: ID) { slackWorkspaces(conferenceId: $c) { id name conferenceCount } }`;
const PICK = `mutation ($c: ID!, $w: ID) { setConferenceSlackWorkspace(conferenceId: $c, slackWorkspaceId: $w) }`;

test('the workspaces are the system admins’, the choice is project management’s', async ({
	browser
}) => {
	const carePage = await signedIn(browser, care.id);
	const managementPage = await signedIn(browser, management.id);
	const adminPage = await signedIn(browser, 'e2e-ntf-admin', ['admin']);

	// the whole list is for system admins
	expect(codeOf(await gql(carePage, WORKSPACES))).toBe('FORBIDDEN');
	expect(codeOf(await gql(managementPage, WORKSPACES))).toBe('FORBIDDEN');
	const all = await gql<{ slackWorkspaces: { id: string }[] }>(adminPage, WORKSPACES);
	expect(all.data?.slackWorkspaces.map((workspace) => workspace.id)).toContain(fixture.workspaceId);

	// adding one is, too; a token Slack never issued is refused before anything is asked
	const ADD = `mutation ($token: String!) { createSlackWorkspace(name: "Nope", botToken: $token) }`;
	expect(codeOf(await gql(managementPage, ADD, { token: 'xoxb-e2e-1' }))).toBe('FORBIDDEN');
	expect(codeOf(await gql(adminPage, ADD, { token: 'not-a-bot-token' }))).toBe('INVALID_INPUT');

	// project management sees the choices for its conference and picks; participant care does not
	expect(codeOf(await gql(carePage, WORKSPACES, { c: CONFERENCE }))).toBe('FORBIDDEN');
	expect(codeOf(await gql(carePage, PICK, { c: CONFERENCE, w: fixture.workspaceId }))).toBe(
		'FORBIDDEN'
	);
	const choices = await gql<{ slackWorkspaces: { id: string }[] }>(managementPage, WORKSPACES, {
		c: CONFERENCE
	});
	expect(choices.data?.slackWorkspaces.map((workspace) => workspace.id)).toContain(
		fixture.workspaceId
	);
	expect(codeOf(await gql(managementPage, PICK, { c: CONFERENCE, w: 'no-such-workspace' }))).toBe(
		'NOT_FOUND'
	);
	const picked = await gql(managementPage, PICK, { c: CONFERENCE, w: fixture.workspaceId });
	expect(picked.errors).toBeUndefined();

	// the team now reads which workspace tells it
	expect((await settingsOf(carePage))?.slackWorkspaceName).toBe(fixture.workspaceName);
});

test('a bot token is no field of the API', async ({ browser }) => {
	const adminPage = await signedIn(browser, 'e2e-ntf-admin', ['admin']);
	for (const field of ['botToken', 'botTokenCiphertext']) {
		const result = await gql(adminPage, `{ slackWorkspaces { id ${field} } }`);
		expect(result.data ?? null).toBeNull();
		expect(result.errors?.length).toBeGreaterThan(0);
	}
});

test('the page lists the topics and a switch saves', async ({ browser }) => {
	const page = await signedIn(browser, care.id);
	await page.goto('/dashboard');
	await page.getByRole('button', { name: /Nora Care/ }).click();
	// the notifications are a tab of the account
	await page.locator('a[href$="/my-account"]').click();
	await page.getByRole('tab', { name: /Benachrichtigungen|Notifications/ }).click();
	await expect(page).toHaveURL(/\/my-account\/notifications$/);

	const section = page.getByTestId('notifications-conference').filter({ hasText: fixture.title });
	await expect(section.getByTestId('notification-row')).toHaveCount(2);
	await expect(section.getByTestId('slack-connection')).toBeVisible();

	const mailForCare = section.getByRole('checkbox', {
		name: 'E-Mail für Teilnehmendenbetreuung'
	});
	await expect(mailForCare).toBeChecked();
	await mailForCare.click();
	await expect(mailForCare).not.toBeChecked();
	await expect
		.poll(async () => (await settingsOf(page))?.settings[0])
		.toMatchObject({ topic: 'PARTICIPANT_CARE', email: false, slack: true });

	// the choice is still there after a reload
	await page.reload();
	await expect(
		section.getByRole('checkbox', { name: 'E-Mail für Teilnehmendenbetreuung' })
	).not.toBeChecked();
});

test('a conference is switched off and on at once', async ({ browser }) => {
	const page = await signedIn(browser, care.id);
	await page.goto('/my-account/notifications');
	const section = page.getByTestId('notifications-conference').filter({ hasText: fixture.title });
	const switches = section.getByRole('checkbox');
	await expect(switches).toHaveCount(4);

	await section
		.getByRole('button', { name: `Alle Benachrichtigungen für ${fixture.title} ausschalten` })
		.click();
	await expect
		.poll(async () => (await settingsOf(page))?.settings)
		.toEqual([
			expect.objectContaining({ email: false, slack: false }),
			expect.objectContaining({ email: false, slack: false })
		]);
	for (const toggle of await switches.all()) await expect(toggle).not.toBeChecked();

	await page
		.getByRole('button', { name: 'Alle Benachrichtigungen in allen Konferenzen einschalten' })
		.click();
	for (const toggle of await switches.all()) await expect(toggle).toBeChecked();
});

test('a member without an inbox is told there is nothing to set up', async ({ browser }) => {
	const page = await signedIn(browser, plain.id);
	await page.goto('/my-account/notifications');
	const section = page.getByTestId('notifications-conference').filter({ hasText: fixture.title });
	await expect(section.getByTestId('notification-row')).toHaveCount(0);
	await expect(section).toContainText('betreust du kein Postfach');
});
