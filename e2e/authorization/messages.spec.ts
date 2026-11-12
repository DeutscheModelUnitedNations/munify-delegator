import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { messagesFixture } from '../seed/messages';
import { E2E_SEATS_GV_ID } from '../seed/seats';

// The chats (`src/api/handlers/chat/`): a chat is read by its parties and, for a team chat, by
// whoever answers its inbox; participants know each other by role only; participant care reads a
// chat between participants only while a report is open; blocks, suspensions and the conference's
// switch close a chat for writing. The specs build on each other's chats, so they run in order
// (the fixture, e2e/seed/messages.ts, starts every run without any).
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

async function signedIn(browser: import('@playwright/test').Browser, id: string) {
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(id, fixture.claims(id)));
	return page;
}

const fixture = messagesFixture('auth');
const CONFERENCE = fixture.conferenceId;
const GV = fixture.gvId;
const SR = fixture.srId;
const { anna, bert, carla, dora } = fixture.delegates;
const { care, chair, reviewer, management, member, tessa, theo } = fixture.team;
const participant = (person: { id: string }) => fixture.participantId(person.id);

const OPEN_DIRECT = `mutation ($c: ID!, $p: ID!) { openDirectChat(conferenceId: $c, participantId: $p) { id } }`;
const OPEN_TEAM = `mutation ($c: ID!, $inbox: ChatinboxEnum!, $committee: ID, $p: ID, $trusted: ID) {
	openTeamChat(
		conferenceId: $c, inbox: $inbox, committeeId: $committee, participantId: $p, trustedPersonId: $trusted
	) { id }
}`;
const SEND = `mutation ($chat: ID!, $body: String!) { sendChatMessage(chatId: $chat, body: $body) { id } }`;
const CHATS = `query ($c: ID!) {
	chats(where: { conferenceId: { eq: $c } }) {
		id kind side underReview
		contacts { participantId roleKind nationAlpha3Code committeeAbbreviation userId suspended }
		people { name userId }
	}
}`;
const MESSAGES = `query ($chat: ID!) {
	chatMessages(where: { chatId: { eq: $chat } }, orderBy: { createdAt: asc }) {
		body mine fromTeam authorName authorParticipantId teamAuthorUserId
	}
}`;

type ChatRow = {
	id: string;
	kind: string;
	side: string;
	underReview: boolean;
	contacts: {
		participantId: string;
		nationAlpha3Code: string | null;
		committeeAbbreviation: string | null;
		userId: string | null;
		suspended: boolean | null;
	}[];
	people: { name: string; userId: string }[];
};
type MessageRow = {
	body: string;
	mine: boolean;
	fromTeam: boolean;
	authorName: string | null;
	authorParticipantId: string | null;
	teamAuthorUserId: string | null;
};

const chatsOf = async (page: Page) =>
	(await gql<{ chats: ChatRow[] }>(page, CHATS, { c: CONFERENCE })).data?.chats ?? [];
const messagesOf = async (page: Page, chat: string) =>
	(await gql<{ chatMessages: MessageRow[] }>(page, MESSAGES, { chat })).data?.chatMessages ?? [];

async function openDirect(page: Page, to: { id: string }) {
	const result = await gql<{ openDirectChat: { id: string } }>(page, OPEN_DIRECT, {
		c: CONFERENCE,
		p: participant(to)
	});
	return { id: result.data?.openDirectChat?.id ?? '', result };
}

async function openTeam(
	page: Page,
	args: { inbox: string; committee?: string; p?: string; trusted?: string }
) {
	const result = await gql<{ openTeamChat: { id: string } }>(page, OPEN_TEAM, {
		c: CONFERENCE,
		...args
	});
	return { id: result.data?.openTeamChat?.id ?? '', result };
}

const send = (page: Page, chat: string, body: string) => gql(page, SEND, { chat, body });

/** The chats the specs below build up, by who they are between. */
const chat = { annaCarla: '', annaChairs: '', annaConsultants: '', bertCare: '' };

test('two delegates write each other and know each other by role only', async ({ browser }) => {
	const annaPage = await signedIn(browser, anna.id);
	const carlaPage = await signedIn(browser, carla.id);

	const contacts = await gql<{
		chatContacts: { participantId: string; nationAlpha3Code: string; userId: string | null }[];
	}>(
		annaPage,
		`query ($c: ID!) { chatContacts(conferenceId: $c) { participantId nationAlpha3Code userId } }`,
		{
			c: CONFERENCE
		}
	);
	const listed = contacts.data?.chatContacts ?? [];
	// everybody seated but herself, and nobody's account
	expect(listed.map((contact) => contact.participantId).sort()).toEqual(
		[bert, carla, dora].map(participant).sort()
	);
	expect(listed.every((contact) => contact.userId === null)).toBe(true);

	chat.annaCarla = (await openDirect(annaPage, carla)).id;
	expect(chat.annaCarla).not.toBe('');
	// the same two people share one chat, whoever opens it
	expect((await openDirect(carlaPage, anna)).id).toBe(chat.annaCarla);

	expect((await send(annaPage, chat.annaCarla, 'Hallo Frankreich!')).errors).toBeUndefined();
	expect((await send(carlaPage, chat.annaCarla, 'Hallo Deutschland!')).errors).toBeUndefined();

	const carlasChat = (await chatsOf(carlaPage)).find((row) => row.id === chat.annaCarla);
	expect(carlasChat?.side).toBe('PARTICIPANT');
	expect(carlasChat?.contacts).toEqual([
		expect.objectContaining({
			participantId: participant(anna),
			nationAlpha3Code: 'deu',
			committeeAbbreviation: fixture.gv,
			userId: null,
			suspended: null
		})
	]);
	expect(carlasChat?.people).toEqual([]);

	const messages = await messagesOf(carlaPage, chat.annaCarla);
	expect(messages.map((message) => [message.body, message.mine])).toEqual([
		['Hallo Frankreich!', false],
		['Hallo Deutschland!', true]
	]);
	expect(messages.every((message) => message.authorName === null)).toBe(true);
	expect(messages.every((message) => message.teamAuthorUserId === null)).toBe(true);
});

test('nobody outside a direct chat reads it or writes in it', async ({ browser }) => {
	for (const outsider of [bert, care, chair, management, { id: fixture.supervisorId }]) {
		const page = await signedIn(browser, outsider.id);
		expect(
			(await chatsOf(page)).map((row) => row.id),
			outsider.id
		).not.toContain(chat.annaCarla);
		expect(await messagesOf(page, chat.annaCarla), outsider.id).toEqual([]);
		expect(codeOf(await send(page, chat.annaCarla, 'mitlesen')), outsider.id).toBe('NOT_FOUND');
	}
});

test('supervisors and team members without an inbox take no part', async ({ browser }) => {
	const supervisorPage = await signedIn(browser, fixture.supervisorId);
	expect(codeOf((await openDirect(supervisorPage, anna)).result)).toBe('FORBIDDEN');
	expect(codeOf((await openTeam(supervisorPage, { inbox: 'PARTICIPANT_CARE' })).result)).toBe(
		'FORBIDDEN'
	);

	const memberPage = await signedIn(browser, member.id);
	expect(
		codeOf(
			await gql(
				memberPage,
				`query ($c: ID!) { chatContacts(conferenceId: $c) { participantId } }`,
				{
					c: CONFERENCE
				}
			)
		)
	).toBe('FORBIDDEN');
	expect(
		codeOf((await openTeam(memberPage, { inbox: 'PARTICIPANT_CARE', p: participant(anna) })).result)
	).toBe('FORBIDDEN');
});

test('a team inbox is read by whoever answers it, and answers carry a name', async ({
	browser
}) => {
	const annaPage = await signedIn(browser, anna.id);
	const bertPage = await signedIn(browser, bert.id);
	const chairPage = await signedIn(browser, chair.id);
	const reviewerPage = await signedIn(browser, reviewer.id);
	const carePage = await signedIn(browser, care.id);

	// Anna sits in GV: its chairs and consultants are hers to write to, participant care and the
	// trusted persons anybody's
	const inboxes = await gql<{ chatInboxes: { inbox: string; committeeId: string | null }[] }>(
		annaPage,
		`query ($c: ID!) { chatInboxes(conferenceId: $c) { inbox committeeId } }`,
		{ c: CONFERENCE }
	);
	expect(inboxes.data?.chatInboxes).toEqual([
		{ inbox: 'PARTICIPANT_CARE', committeeId: null },
		// the trusted persons together, and each of the two
		{ inbox: 'TRUSTED_PERSON', committeeId: null },
		{ inbox: 'TRUSTED_PERSON', committeeId: null },
		{ inbox: 'TRUSTED_PERSON', committeeId: null },
		{ inbox: 'CHAIR', committeeId: GV },
		{ inbox: 'CONSULTANT', committeeId: GV }
	]);

	chat.annaChairs = (await openTeam(annaPage, { inbox: 'CHAIR', committee: GV })).id;
	chat.annaConsultants = (await openTeam(annaPage, { inbox: 'CONSULTANT', committee: GV })).id;
	chat.bertCare = (await openTeam(bertPage, { inbox: 'PARTICIPANT_CARE' })).id;
	await send(annaPage, chat.annaChairs, 'Frage an den Vorsitz');
	await send(annaPage, chat.annaConsultants, 'Frage an die Beratung');
	await send(bertPage, chat.bertCare, 'Frage an die Betreuung');

	// Bert sits in SR, which nobody chairs: GV's chairs are not his
	expect(codeOf((await openTeam(bertPage, { inbox: 'CHAIR', committee: GV })).result)).toBe(
		'CONFLICT'
	);

	const idsOf = async (page: Page) => (await chatsOf(page)).map((row) => row.id).sort();
	expect(await idsOf(chairPage)).toEqual([chat.annaChairs]);
	expect(await idsOf(reviewerPage)).toEqual([chat.annaConsultants]);
	expect(await idsOf(carePage)).toEqual([chat.bertCare]);

	// the chair answers; Anna reads who of the team wrote, the chair reads her by role
	expect((await send(chairPage, chat.annaChairs, 'Antwort vom Vorsitz')).errors).toBeUndefined();
	const [, answer] = await messagesOf(annaPage, chat.annaChairs);
	expect(answer).toMatchObject({
		body: 'Antwort vom Vorsitz',
		fromTeam: true,
		mine: false,
		authorName: `${chair.given} ${chair.family}`,
		teamAuthorUserId: null
	});
	const [chairsChat] = await chatsOf(chairPage);
	expect(chairsChat?.side).toBe('TEAM');
	expect(chairsChat?.contacts[0]).toMatchObject({ nationAlpha3Code: 'deu', userId: null });
	expect(chairsChat?.people).toEqual([]);
	const [question] = await messagesOf(chairPage, chat.annaChairs);
	expect(question?.authorName).toBeNull();

	// participant care knows whom it is talking to
	const [caresChat] = await chatsOf(carePage);
	expect(caresChat?.people).toEqual([{ name: `${bert.given} ${bert.family}`, userId: bert.id }]);

	// a team member opens a chat only from an inbox they answer, with somebody it reaches
	expect(
		codeOf(
			(await openTeam(chairPage, { inbox: 'CONSULTANT', committee: GV, p: participant(anna) }))
				.result
		)
	).toBe('FORBIDDEN');
	expect(
		codeOf(
			(await openTeam(chairPage, { inbox: 'CHAIR', committee: GV, p: participant(bert) })).result
		)
	).toBe('CONFLICT');
	expect(
		(await openTeam(chairPage, { inbox: 'CHAIR', committee: GV, p: participant(anna) })).id
	).toBe(chat.annaChairs);
});

test('blocking closes a direct chat for both, and only that chat', async ({ browser }) => {
	const annaPage = await signedIn(browser, anna.id);
	const carlaPage = await signedIn(browser, carla.id);
	const BLOCK = `mutation ($chat: ID!, $blocked: Boolean!) { setChatBlocked(chatId: $chat, blocked: $blocked) }`;

	expect(
		(await gql(carlaPage, BLOCK, { chat: chat.annaCarla, blocked: true })).errors
	).toBeUndefined();
	expect(codeOf(await send(annaPage, chat.annaCarla, 'noch da?'))).toBe('CONFLICT');
	expect(codeOf(await send(carlaPage, chat.annaCarla, 'nein'))).toBe('CONFLICT');
	// the team is still hers to write to
	expect((await send(annaPage, chat.annaChairs, 'Danke!')).errors).toBeUndefined();
	// a team chat has nobody to block
	expect(codeOf(await gql(annaPage, BLOCK, { chat: chat.annaChairs, blocked: true }))).toBe(
		'INVALID_INPUT'
	);

	await gql(carlaPage, BLOCK, { chat: chat.annaCarla, blocked: false });
	expect((await send(annaPage, chat.annaCarla, 'wieder da')).errors).toBeUndefined();
});

test('participant care reads a chat only while it is reported, and may suspend', async ({
	browser
}) => {
	const annaPage = await signedIn(browser, anna.id);
	const carlaPage = await signedIn(browser, carla.id);
	const carePage = await signedIn(browser, care.id);
	const chairPage = await signedIn(browser, chair.id);

	// only a party reports, and only chats between participants
	const REPORT = `mutation ($chat: ID!, $reason: String!) { reportChat(chatId: $chat, reason: $reason) }`;
	expect(codeOf(await gql(carePage, REPORT, { chat: chat.annaCarla, reason: 'x' }))).toBe(
		'NOT_FOUND'
	);
	expect(codeOf(await gql(annaPage, REPORT, { chat: chat.annaChairs, reason: 'x' }))).toBe(
		'INVALID_INPUT'
	);
	expect(
		(await gql(carlaPage, REPORT, { chat: chat.annaCarla, reason: 'Unfreundlich' })).errors
	).toBeUndefined();

	// participant care now reads it, with the names, but does not write; the chair still sees nothing
	const reviewed = (await chatsOf(carePage)).find((row) => row.id === chat.annaCarla);
	expect(reviewed).toMatchObject({ side: 'REVIEW', underReview: true });
	expect(reviewed?.people.map((person) => person.name).sort()).toEqual([
		`${anna.given} ${anna.family}`,
		`${carla.given} ${carla.family}`
	]);
	const read = await messagesOf(carePage, chat.annaCarla);
	expect(read[0]).toMatchObject({ body: 'Hallo Frankreich!', authorName: 'Anna Alpha' });
	expect(codeOf(await send(carePage, chat.annaCarla, 'Hier die Betreuung'))).toBe('FORBIDDEN');
	expect((await chatsOf(chairPage)).map((row) => row.id)).not.toContain(chat.annaCarla);

	const REPORTS = `query ($c: ID!) { chatReports(where: { conferenceId: { eq: $c } }) { id reason status reporterName } }`;
	const reports = await gql<{
		chatReports: { id: string; reason: string; status: string; reporterName: string }[];
	}>(carePage, REPORTS, { c: CONFERENCE });
	expect(reports.data?.chatReports).toEqual([
		expect.objectContaining({ reason: 'Unfreundlich', status: 'OPEN', reporterName: 'Carla Gamma' })
	]);
	// reports are participant care's alone
	for (const page of [annaPage, carlaPage, chairPage]) {
		expect(
			(await gql<{ chatReports: unknown[] }>(page, REPORTS, { c: CONFERENCE })).data?.chatReports
		).toEqual([]);
	}

	// suspending is participant care's; a suspended person still reaches the team
	const SUSPEND = `mutation ($p: ID!, $suspended: Boolean!) { setMessagingSuspended(participantId: $p, suspended: $suspended) }`;
	expect(codeOf(await gql(chairPage, SUSPEND, { p: participant(anna), suspended: true }))).toBe(
		'FORBIDDEN'
	);
	expect(
		(await gql(carePage, SUSPEND, { p: participant(anna), suspended: true })).errors
	).toBeUndefined();
	await expect
		.poll(async () => codeOf(await send(annaPage, chat.annaCarla, 'gesperrt?')))
		.toBe('CONFLICT');
	expect((await send(annaPage, chat.annaChairs, 'Ich bin gesperrt')).errors).toBeUndefined();
	await gql(carePage, SUSPEND, { p: participant(anna), suspended: false });

	// settling the report makes the chat private again
	const RESOLVE = `mutation ($id: ID!) { resolveChatReport(id: $id) { status } }`;
	const reportId = reports.data?.chatReports[0]?.id ?? '';
	expect(codeOf(await gql(chairPage, RESOLVE, { id: reportId }))).toBe('NOT_FOUND');
	expect((await gql(carePage, RESOLVE, { id: reportId })).errors).toBeUndefined();
	expect((await chatsOf(carePage)).map((row) => row.id)).not.toContain(chat.annaCarla);
	expect(await messagesOf(carePage, chat.annaCarla)).toEqual([]);
});

test('committee functions are handed out by whoever manages the team', async ({ browser }) => {
	const memberPage = await signedIn(browser, member.id);
	const managementPage = await signedIn(browser, management.id);
	const GIVE = `mutation ($member: ID!, $committee: ID!) {
		giveTeamFunction(teamMemberId: $member, committeeId: $committee, kind: CHAIR) { id }
	}`;
	const teamMemberId = `e2e-team-${member.id}`;

	expect(codeOf(await gql(memberPage, GIVE, { member: teamMemberId, committee: SR }))).toBe(
		'FORBIDDEN'
	);
	// a committee of another conference is refused by the database
	expect(
		codeOf(await gql(managementPage, GIVE, { member: teamMemberId, committee: E2E_SEATS_GV_ID }))
	).toBe('INVALID_INPUT');

	const given = await gql<{ giveTeamFunction: { id: string } }>(managementPage, GIVE, {
		member: teamMemberId,
		committee: SR
	});
	expect(given.errors).toBeUndefined();

	// SR is chaired now: Bert, who sits there, reaches its chairs, and the member reads the chat
	const bertPage = await signedIn(browser, bert.id);
	const opened = await openTeam(bertPage, { inbox: 'CHAIR', committee: SR });
	expect(opened.result.errors).toBeUndefined();
	await send(bertPage, opened.id, 'Frage an den neuen Vorsitz');
	expect((await chatsOf(memberPage)).map((row) => row.id)).toEqual([opened.id]);

	const REMOVE = `mutation ($id: ID!) { removeTeamFunction(id: $id) }`;
	const functionId = given.data?.giveTeamFunction.id ?? '';
	expect(codeOf(await gql(memberPage, REMOVE, { id: functionId }))).toBe('NOT_FOUND');
	expect((await gql(managementPage, REMOVE, { id: functionId })).errors).toBeUndefined();
	// without the function the inbox is nobody's any more
	expect(await chatsOf(memberPage)).toEqual([]);
});

test('what is written to the trusted persons stays with them', async ({ browser }) => {
	const doraPage = await signedIn(browser, dora.id);
	const tessaPage = await signedIn(browser, tessa.id);
	const theoPage = await signedIn(browser, theo.id);
	const carePage = await signedIn(browser, care.id);
	const managementPage = await signedIn(browser, management.id);
	const adminPage = await (await browser.newContext()).newPage();
	await loginAs(adminPage, fixedTestUser('e2e-msa-admin', { roles: ['admin'] }));

	// Dora finds the trusted persons together, and each of them by name (never by account)
	const INBOXES = `query ($c: ID!) { chatInboxes(conferenceId: $c) { inbox trustedPersonId personName } }`;
	type Inbox = { inbox: string; trustedPersonId: string | null; personName: string | null };
	const listed = await gql<{ chatInboxes: Inbox[] }>(doraPage, INBOXES, { c: CONFERENCE });
	const trusted = (listed.data?.chatInboxes ?? []).filter((row) => row.inbox === 'TRUSTED_PERSON');
	expect(trusted.map((row) => row.personName)).toEqual([
		null,
		`${tessa.given} ${tessa.family}`,
		`${theo.given} ${theo.family}`
	]);
	const toTessa = trusted[1]?.trustedPersonId ?? '';
	expect(toTessa).not.toBe('');
	expect(JSON.stringify(trusted)).not.toContain(tessa.id);

	const shared = (await openTeam(doraPage, { inbox: 'TRUSTED_PERSON' })).id;
	const personal = (await openTeam(doraPage, { inbox: 'TRUSTED_PERSON', trusted: toTessa })).id;
	expect(shared).not.toBe('');
	expect(personal).not.toBe('');
	expect(personal).not.toBe(shared);
	// asking again finds the same chats
	expect((await openTeam(doraPage, { inbox: 'TRUSTED_PERSON', trusted: toTessa })).id).toBe(
		personal
	);
	await send(doraPage, shared, 'An alle Vertrauenspersonen');
	await send(doraPage, personal, 'Nur für Tessa');

	// both read what was written to all of them; only Tessa what was written to her
	const idsOf = async (page: Page) => (await chatsOf(page)).map((row) => row.id).sort();
	expect(await idsOf(tessaPage)).toEqual([shared, personal].sort());
	expect(await idsOf(theoPage)).toEqual([shared]);
	expect(await messagesOf(theoPage, personal)).toEqual([]);
	expect(codeOf(await send(theoPage, personal, 'mitlesen?'))).toBe('NOT_FOUND');

	// nobody else: not participant care, not project management, not a system admin
	for (const page of [carePage, managementPage, adminPage]) {
		const ids = await idsOf(page);
		expect(ids).not.toContain(shared);
		expect(ids).not.toContain(personal);
		expect(await messagesOf(page, shared)).toEqual([]);
		expect(await messagesOf(page, personal)).toEqual([]);
		expect(codeOf(await send(page, shared, 'mitlesen?'))).toBe('NOT_FOUND');
	}

	// Dora stays a role to them, and their answer carries their name
	const tessasChats = await chatsOf(tessaPage);
	for (const row of tessasChats) {
		expect(row.side).toBe('TEAM');
		expect(row.contacts[0]).toMatchObject({ nationAlpha3Code: 'fra', userId: null });
		expect(row.people).toEqual([]);
	}
	const [question] = await messagesOf(tessaPage, personal);
	expect(question).toMatchObject({ body: 'Nur für Tessa', authorName: null });
	expect((await send(tessaPage, personal, 'Ich bin für dich da')).errors).toBeUndefined();
	const [, answer] = await messagesOf(doraPage, personal);
	expect(answer).toMatchObject({
		fromTeam: true,
		authorName: `${tessa.given} ${tessa.family}`,
		teamAuthorUserId: null
	});

	// such a chat cannot be reported to participant care
	const REPORT = `mutation ($chat: ID!) { reportChat(chatId: $chat, reason: "x") }`;
	expect(codeOf(await gql(doraPage, REPORT, { chat: personal }))).toBe('INVALID_INPUT');

	// a trusted person is one for the whole conference: no committee, and no committee function without one
	const GIVE = `mutation ($member: ID!, $committee: ID, $kind: TeamfunctionkindEnum!) {
		giveTeamFunction(teamMemberId: $member, committeeId: $committee, kind: $kind) { id }
	}`;
	const memberRow = `e2e-team-${member.id}`;
	expect(
		codeOf(
			await gql(managementPage, GIVE, { member: memberRow, committee: GV, kind: 'TRUSTED_PERSON' })
		)
	).toBe('INVALID_INPUT');
	expect(codeOf(await gql(managementPage, GIVE, { member: memberRow, kind: 'CHAIR' }))).toBe(
		'INVALID_INPUT'
	);
	expect(codeOf(await gql(tessaPage, GIVE, { member: memberRow, kind: 'TRUSTED_PERSON' }))).toBe(
		'FORBIDDEN'
	);
});

test('switching messaging off closes every chat for writing but keeps it readable', async ({
	browser
}) => {
	const annaPage = await signedIn(browser, anna.id);
	const chairPage = await signedIn(browser, chair.id);
	const managementPage = await signedIn(browser, management.id);
	const SWITCH = `mutation ($c: ID!, $on: Boolean!) { updateConference(id: $c, messagingEnabled: $on) { messagingEnabled } }`;

	expect(codeOf(await gql(chairPage, SWITCH, { c: CONFERENCE, on: false }))).toBe('FORBIDDEN');
	expect((await gql(managementPage, SWITCH, { c: CONFERENCE, on: false })).errors).toBeUndefined();
	try {
		expect(codeOf(await send(annaPage, chat.annaCarla, 'aus?'))).toBe('CONFLICT');
		expect(codeOf(await send(chairPage, chat.annaChairs, 'aus?'))).toBe('CONFLICT');
		expect(codeOf((await openDirect(annaPage, dora)).result)).toBe('CONFLICT');
		expect((await messagesOf(annaPage, chat.annaCarla)).length).toBeGreaterThan(0);
	} finally {
		await gql(managementPage, SWITCH, { c: CONFERENCE, on: true });
	}
	expect((await send(annaPage, chat.annaCarla, 'wieder an')).errors).toBeUndefined();
});
