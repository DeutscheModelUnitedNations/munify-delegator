import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { groupChatsFixture } from '../seed/groupChats';

// The groups of committees and custom roles and the inboxes of custom roles
// (`src/api/handlers/chat/`, "Messages" in docs/architecture/messages.md): a group is read by the
// people seated there, once released and while the conference opened the groups, and by the team
// members holding a function there; participant care only while a report is open. A custom role's
// inbox is answered by whoever looks after it. The specs build on each other's chats, so they run
// in order (the fixture, e2e/seed/groupChats.ts, starts every run without any).
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

const fixture = groupChatsFixture('auth');
const CONFERENCE = fixture.conferenceId;
const { anna, bert, carla } = fixture.delegates;
const { pia, quirin } = fixture.singles;
const { chair, consultant, support, care, management, member } = fixture.team;

async function signedIn(browser: import('@playwright/test').Browser, id: string) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)));
	return page;
}

const GROUPS = `query ($c: ID!) { chatGroups(conferenceId: $c) { kind committeeId roleId asTeam chatId } }`;
const OPEN_GROUP = `mutation ($c: ID!, $committee: ID, $role: ID) {
	openGroupChat(conferenceId: $c, committeeId: $committee, roleId: $role) { id kind side }
}`;
const SEND = `mutation ($chat: ID!, $body: String!) { sendChatMessage(chatId: $chat, body: $body) { id } }`;
const CHATS = `query ($c: ID!) {
	chats(where: { conferenceId: { eq: $c } }) {
		id kind side muted unreadCount writeRefusal
		contacts { participantId committeeAbbreviation userId }
	}
}`;
const MESSAGES = `query ($chat: ID!) {
	chatMessages(where: { chatId: { eq: $chat } }, orderBy: { createdAt: asc }) {
		id body mine fromTeam authorName authorParticipantId
	}
}`;
const MUTE = `mutation ($chat: ID!, $muted: Boolean!) { setChatMuted(chatId: $chat, muted: $muted) }`;
const SWITCH = `mutation ($c: ID!, $on: Boolean!) { updateConference(id: $c, groupChatsEnabled: $on) { groupChatsEnabled } }`;

type GroupRow = {
	kind: string;
	committeeId: string | null;
	roleId: string | null;
	asTeam: boolean;
	chatId: string | null;
};
type ChatRow = {
	id: string;
	kind: string;
	side: string;
	muted: boolean;
	unreadCount: number;
	writeRefusal: string | null;
	contacts: {
		participantId: string;
		committeeAbbreviation: string | null;
		userId: string | null;
	}[];
};
type MessageRow = {
	id: string;
	body: string | null;
	mine: boolean;
	fromTeam: boolean;
	authorName: string | null;
	authorParticipantId: string | null;
};

/** A read that must succeed: a refusal would otherwise pass for an empty list. */
function listOf<T>(result: GraphQLResult<Record<string, T[]>>, field: string) {
	expect(result.errors).toBeUndefined();
	const rows = result.data?.[field];
	expect(rows).toBeDefined();
	return rows ?? [];
}

const groupsOf = async (page: Page) =>
	listOf(await gql<{ chatGroups: GroupRow[] }>(page, GROUPS, { c: CONFERENCE }), 'chatGroups');
const chatsOf = async (page: Page) =>
	listOf(await gql<{ chats: ChatRow[] }>(page, CHATS, { c: CONFERENCE }), 'chats');
const messagesOf = async (page: Page, chat: string) =>
	listOf(await gql<{ chatMessages: MessageRow[] }>(page, MESSAGES, { chat }), 'chatMessages');
const send = (page: Page, chat: string, body: string) => gql(page, SEND, { chat, body });
const openGroup = async (page: Page, group: { committee?: string; role?: string }) => {
	const result = await gql<{ openGroupChat: { id: string; kind: string; side: string } }>(
		page,
		OPEN_GROUP,
		{ c: CONFERENCE, ...group }
	);
	return { chat: result.data?.openGroupChat, result };
};

/** The groups the specs below open. */
const chat = { gv: '', press: '', pressInbox: '' };

test('everybody is in the group of their committee or role, and nobody else', async ({
	browser
}) => {
	const pages = await Promise.all(
		[anna, bert, pia, quirin, chair, consultant, support, care, member].map((person) =>
			signedIn(browser, person.id)
		)
	);
	const [
		annaPage,
		bertPage,
		piaPage,
		quirinPage,
		chairPage,
		consultantPage,
		supportPage,
		carePage,
		memberPage
	] = pages;
	const keysOf = async (page: Page) =>
		(await groupsOf(page)).map((group) => [group.committeeId ?? group.roleId, group.asTeam]);

	expect(await keysOf(annaPage)).toEqual([[fixture.gvId, false]]);
	expect(await keysOf(bertPage)).toEqual([[fixture.srId, false]]);
	expect(await keysOf(piaPage)).toEqual([[fixture.pressRoleId, false]]);
	expect(await keysOf(chairPage)).toEqual([[fixture.gvId, true]]);
	expect(await keysOf(consultantPage)).toEqual([[fixture.srId, true]]);
	expect(await keysOf(supportPage)).toEqual([[fixture.pressRoleId, true]]);
	// without a role, participant care and a member without a function are in none
	for (const page of [quirinPage, carePage, memberPage]) expect(await groupsOf(page)).toEqual([]);

	// a group one is not in cannot be opened
	expect(codeOf((await openGroup(bertPage, { committee: fixture.gvId })).result)).toBe('FORBIDDEN');
	expect(codeOf((await openGroup(carePage, { committee: fixture.gvId })).result)).toBe('FORBIDDEN');
	expect(codeOf((await openGroup(quirinPage, { role: fixture.pressRoleId })).result)).toBe(
		'FORBIDDEN'
	);
	// exactly one of the two is named
	expect(
		codeOf(
			(await openGroup(annaPage, { committee: fixture.gvId, role: fixture.pressRoleId })).result
		)
	).toBe('INVALID_INPUT');
});

test("a committee's group is read by those seated there and its chairs, by role and by name", async ({
	browser
}) => {
	const annaPage = await signedIn(browser, anna.id);
	const carlaPage = await signedIn(browser, carla.id);
	const bertPage = await signedIn(browser, bert.id);
	const chairPage = await signedIn(browser, chair.id);
	const carePage = await signedIn(browser, care.id);

	const opened = await openGroup(annaPage, { committee: fixture.gvId });
	expect(opened.chat).toMatchObject({ kind: 'COMMITTEE', side: 'PARTICIPANT' });
	chat.gv = opened.chat?.id ?? '';
	// opened once: the chair finds the same group
	expect((await openGroup(chairPage, { committee: fixture.gvId })).chat).toMatchObject({
		id: chat.gv,
		side: 'TEAM'
	});

	expect((await send(annaPage, chat.gv, 'Hallo Gremium!')).errors).toBeUndefined();
	expect(
		(await send(chairPage, chat.gv, 'Willkommen, hier ist der Vorsitz.')).errors
	).toBeUndefined();

	const carlaReads = await messagesOf(carlaPage, chat.gv);
	expect(carlaReads.map(({ body, fromTeam, authorName }) => [body, fromTeam, authorName])).toEqual([
		// participants are a role to each other, the team is a name
		['Hallo Gremium!', false, null],
		['Willkommen, hier ist der Vorsitz.', true, 'Chris Chair']
	]);
	const carlaChat = (await chatsOf(carlaPage)).find((row) => row.id === chat.gv);
	expect(carlaChat?.unreadCount).toBe(2);
	expect(carlaChat?.writeRefusal).toBeNull();
	// the people seated there, by role, with nobody's account
	expect(carlaChat?.contacts.map((contact) => [contact.participantId, contact.userId])).toEqual([
		[fixture.participantId(anna.id), null]
	]);

	// not seated there, not participant care without a report
	expect((await chatsOf(bertPage)).some((row) => row.id === chat.gv)).toBe(false);
	expect((await chatsOf(carePage)).some((row) => row.id === chat.gv)).toBe(false);
	expect(await messagesOf(bertPage, chat.gv)).toEqual([]);
	expect(codeOf(await send(bertPage, chat.gv, 'Hallo?'))).toBe('NOT_FOUND');
});

test('somebody in a group mutes it for themselves only', async ({ browser }) => {
	const carlaPage = await signedIn(browser, carla.id);
	const annaPage = await signedIn(browser, anna.id);
	const bertPage = await signedIn(browser, bert.id);

	expect((await gql(carlaPage, MUTE, { chat: chat.gv, muted: true })).errors).toBeUndefined();
	const carlaChat = (await chatsOf(carlaPage)).find((row) => row.id === chat.gv);
	expect(carlaChat).toMatchObject({ muted: true, unreadCount: 0 });
	const annaChat = (await chatsOf(annaPage)).find((row) => row.id === chat.gv);
	expect(annaChat?.muted).toBe(false);
	// nobody mutes a group they are not in
	expect(codeOf(await gql(bertPage, MUTE, { chat: chat.gv, muted: true }))).toBe('NOT_FOUND');

	expect((await gql(carlaPage, MUTE, { chat: chat.gv, muted: false })).errors).toBeUndefined();
	expect((await chatsOf(carlaPage)).find((row) => row.id === chat.gv)?.unreadCount).toBe(2);
});

test('closing the groups shuts the participants out, never the team', async ({ browser }) => {
	const pmPage = await signedIn(browser, management.id);
	const annaPage = await signedIn(browser, anna.id);
	const chairPage = await signedIn(browser, chair.id);

	expect((await gql(pmPage, SWITCH, { c: CONFERENCE, on: false })).errors).toBeUndefined();
	try {
		expect(await groupsOf(annaPage)).toEqual([]);
		expect((await chatsOf(annaPage)).some((row) => row.id === chat.gv)).toBe(false);
		expect(codeOf(await send(annaPage, chat.gv, 'Noch da?'))).toBe('NOT_FOUND');
		// the team prepares the groups before they open
		expect((await send(chairPage, chat.gv, 'Bald geht es los.')).errors).toBeUndefined();
	} finally {
		expect((await gql(pmPage, SWITCH, { c: CONFERENCE, on: true })).errors).toBeUndefined();
	}
	const annaReads = await messagesOf(annaPage, chat.gv);
	expect(annaReads.at(-1)?.body).toBe('Bald geht es los.');
});

test('a reported group is read by participant care, who hides in it', async ({ browser }) => {
	const carlaPage = await signedIn(browser, carla.id);
	const carePage = await signedIn(browser, care.id);
	const annaPage = await signedIn(browser, anna.id);
	const chairPage = await signedIn(browser, chair.id);

	const REPORT = `mutation ($chat: ID!, $reason: String!) { reportChat(chatId: $chat, reason: $reason) }`;
	// the team in a group reports nothing; its people do
	expect(codeOf(await gql(chairPage, REPORT, { chat: chat.gv, reason: 'x' }))).toBe('FORBIDDEN');
	expect(
		(await gql(carlaPage, REPORT, { chat: chat.gv, reason: 'Unpassend' })).errors
	).toBeUndefined();

	const reviewed = (await chatsOf(carePage)).find((row) => row.id === chat.gv);
	expect(reviewed?.side).toBe('REVIEW');
	const [first] = await messagesOf(carePage, chat.gv);
	const HIDE = `mutation ($id: ID!, $reason: String!) { hideChatMessage(id: $id, reason: $reason) }`;
	expect(
		(await gql(carePage, HIDE, { id: first?.id, reason: 'Testweise ausgeblendet' })).errors
	).toBeUndefined();
	// everybody of the group reads the placeholder, the team too
	for (const page of [annaPage, chairPage]) {
		expect((await messagesOf(page, chat.gv))[0]?.body).toBeNull();
	}
});

test("a custom role's group and inbox are its people's and its support's", async ({ browser }) => {
	const piaPage = await signedIn(browser, pia.id);
	const quirinPage = await signedIn(browser, quirin.id);
	const supportPage = await signedIn(browser, support.id);
	const chairPage = await signedIn(browser, chair.id);

	const opened = await openGroup(piaPage, { role: fixture.pressRoleId });
	expect(opened.chat).toMatchObject({ kind: 'ROLE', side: 'PARTICIPANT' });
	chat.press = opened.chat?.id ?? '';
	expect(
		(await send(supportPage, chat.press, 'Redaktionssitzung um 8:30.')).errors
	).toBeUndefined();
	expect((await messagesOf(piaPage, chat.press))[0]?.authorName).toBe('Lena Leitung');
	expect((await chatsOf(chairPage)).some((row) => row.id === chat.press)).toBe(false);

	const INBOXES = `query ($c: ID!) { chatInboxes(conferenceId: $c) { inbox roleId roleName } }`;
	const piaInboxes =
		(
			await gql<{
				chatInboxes: { inbox: string; roleId: string | null; roleName: string | null }[];
			}>(piaPage, INBOXES, { c: CONFERENCE })
		).data?.chatInboxes ?? [];
	expect(piaInboxes).toContainEqual({
		inbox: 'ROLE_SUPPORT',
		roleId: fixture.pressRoleId,
		roleName: fixture.pressName
	});

	const OPEN_TEAM = `mutation ($c: ID!, $role: ID) {
		openTeamChat(conferenceId: $c, inbox: ROLE_SUPPORT, roleId: $role) { id kind side }
	}`;
	const inbox = await gql<{ openTeamChat: { id: string } }>(piaPage, OPEN_TEAM, {
		c: CONFERENCE,
		role: fixture.pressRoleId
	});
	chat.pressInbox = inbox.data?.openTeamChat.id ?? '';
	expect((await send(piaPage, chat.pressInbox, 'Gibt es Presseausweise?')).errors).toBeUndefined();
	expect((await chatsOf(supportPage)).find((row) => row.id === chat.pressInbox)?.side).toBe('TEAM');
	expect((await chatsOf(chairPage)).some((row) => row.id === chat.pressInbox)).toBe(false);
	// somebody without the role is not reached by its support
	expect(
		codeOf(await gql(quirinPage, OPEN_TEAM, { c: CONFERENCE, role: fixture.pressRoleId }))
	).toBe('CONFLICT');
});

test('support is a custom role’s, chairs a committee’s', async ({ browser }) => {
	const pmPage = await signedIn(browser, management.id);
	const GIVE = `mutation ($member: ID!, $kind: TeamfunctionkindEnum!, $committee: ID, $role: ID) {
		giveTeamFunction(teamMemberId: $member, kind: $kind, committeeId: $committee, roleId: $role) { id }
	}`;
	const memberId = `e2e-team-${member.id}`;
	expect(
		codeOf(
			await gql(pmPage, GIVE, { member: memberId, kind: 'ROLE_SUPPORT', committee: fixture.gvId })
		)
	).toBe('INVALID_INPUT');
	expect(
		codeOf(
			await gql(pmPage, GIVE, {
				member: memberId,
				kind: 'CHAIR',
				committee: fixture.gvId,
				role: fixture.pressRoleId
			})
		)
	).toBe('INVALID_INPUT');
	// a nation is no custom role
	const nationRole = `e2e-nation-${CONFERENCE}-deu`;
	expect(
		codeOf(await gql(pmPage, GIVE, { member: memberId, kind: 'ROLE_SUPPORT', role: nationRole }))
	).toBe('INVALID_INPUT');
});
