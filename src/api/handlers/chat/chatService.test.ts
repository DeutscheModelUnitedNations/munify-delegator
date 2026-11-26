import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Contact } from './chatContacts';
import type { ChatRow } from './chatService';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
const chatPubsub = { created: vi.fn(), updated: vi.fn() };
const chatMessagePubsub = { created: vi.fn() };
vi.mock('#api/pubsub', () => ({
	chatPubsub,
	chatMessagePubsub,
	chatReportPubsub: { created: vi.fn(), updated: vi.fn() },
	conferenceParticipantPubsub: { updated: vi.fn() },
	userPubsub: { updated: vi.fn() }
}));
const tellInboxOnSlack = vi.fn();
const tellGroupOnSlack = vi.fn();
vi.mock('#api/handlers/notification/slackNotifications', () => ({
	tellInboxOnSlack,
	tellGroupOnSlack,
	tellReportOnSlack: vi.fn()
}));
const contacts = new Map<string, Contact>();
vi.mock('./chatContacts', () => ({
	conferenceContacts: async () => contacts,
	forgetContacts: vi.fn()
}));

const service = await import('./chatService');
const { db } = await import('#api/db/db');

/**
 * A query builder that answers every call with itself and, awaited, with `next()`: enough of
 * drizzle's chains (`insert().values().returning()`, `select().from().where()`, …) for the service.
 */
function chain(next: () => unknown): object {
	const handler: ProxyHandler<() => void> = {
		get: (_target, prop) =>
			prop === 'then'
				? (resolve: (value: unknown) => void, reject: (error: unknown) => void) =>
						Promise.resolve(next()).then(resolve, reject)
				: () => proxy,
		apply: () => proxy
	};
	const proxy: object = new Proxy(() => {}, handler);
	return proxy;
}

/** What the next selects, inserts and updates answer, in order. */
let selects: unknown[][] = [];
let inserts: unknown[][] = [];
let updates: unknown[][] = [];
const query = {
	conference: { findFirst: vi.fn() },
	chatBlock: { findFirst: vi.fn() },
	chat: { findFirst: vi.fn(), findMany: vi.fn() },
	teamFunction: { findMany: vi.fn(), findFirst: vi.fn() },
	chatMute: { findMany: vi.fn() },
	paper: { findFirst: vi.fn() }
};
const fakeDb = {
	query,
	select: () => chain(() => selects.shift() ?? []),
	insert: () => chain(() => inserts.shift() ?? []),
	update: () => chain(() => updates.shift() ?? []),
	delete: () => chain(() => []),
	transaction: async (work: (tx: typeof fakeDb) => Promise<unknown>) => work(fakeDb)
};
Object.assign(db, fakeDb);

const flags = { messagingEnabled: false, assignmentReleased: true, groupChatsEnabled: true };

function contact(parts: {
	participantId: string;
	committeeId?: string | null;
	roleId?: string;
	kind?: 'NATION' | 'CUSTOM';
	suspended?: boolean;
}): Contact {
	return {
		participantId: parts.participantId,
		userId: `u-${parts.participantId}`,
		suspended: parts.suspended ?? false,
		delegationId: null,
		role: {
			id: parts.roleId ?? 'deu',
			kind: parts.kind ?? 'NATION',
			nationAlpha3Code: null,
			nation: null,
			name: null,
			abbreviation: null,
			icon: null
		},
		committee: parts.committeeId
			? { id: parts.committeeId, abbreviation: parts.committeeId.toUpperCase(), name: 'Gremium' }
			: null,
		ordinal: null
	};
}

const baseChat = {
	id: 'chat',
	conferenceId: 'c1',
	participantId: null,
	otherParticipantId: null,
	delegationId: null,
	inbox: null,
	committeeId: null,
	roleId: null,
	trustedUserId: null,
	lastMessageAt: null,
	lastParticipantMessageAt: null,
	teamReadAt: null,
	teamArchivedAt: null,
	underReview: false,
	createdAt: new Date(0),
	updatedAt: new Date(0)
};
const gaGroup = { ...baseChat, kind: 'COMMITTEE' as const, committeeId: 'ga' };
const pressGroup = { ...baseChat, kind: 'ROLE' as const, roleId: 'press' };

beforeEach(() => {
	vi.clearAllMocks();
	contacts.clear();
	selects = [];
	inserts = [];
	updates = [];
	query.conference.findFirst.mockResolvedValue(flags);
	query.chatBlock.findFirst.mockResolvedValue(undefined);
	query.chatMute.findMany.mockResolvedValue([]);
});

describe('seatedInGroup and sameInbox', () => {
	test('somebody is in the group of their committee or their custom role only', () => {
		const delegate = contact({ participantId: 'p', committeeId: 'ga' });
		const press = contact({ participantId: 'q', roleId: 'press', kind: 'CUSTOM' });
		expect(service.seatedInGroup({ contact: delegate, chat: gaGroup })).toBe(true);
		expect(
			service.seatedInGroup({ contact: delegate, chat: { ...gaGroup, committeeId: 'sc' } })
		).toBe(false);
		expect(service.seatedInGroup({ contact: press, chat: pressGroup })).toBe(true);
		expect(service.seatedInGroup({ contact: press, chat: { ...baseChat, kind: 'DIRECT' } })).toBe(
			false
		);
	});

	test('an inbox is the one a chat names by kind, committee, role and trusted person', () => {
		const option = {
			inbox: 'ROLE_SUPPORT' as const,
			committee: null,
			role: { id: 'press', name: 'Presse', icon: null },
			person: null
		};
		const wanted = { inbox: 'ROLE_SUPPORT' as const, committeeId: null, trustedUserId: null };
		expect(service.sameInbox({ option, wanted: { ...wanted, roleId: 'press' } })).toBe(true);
		expect(service.sameInbox({ option, wanted: { ...wanted, roleId: 'jury' } })).toBe(false);
		expect(
			service.sameInbox({
				option: { ...option, inbox: 'CHAIR', role: null },
				wanted: { inbox: 'CHAIR', committeeId: 'ga', roleId: null, trustedUserId: null }
			})
		).toBe(false);
	});
});

describe('chatWriteRefusal', () => {
	test('somebody seated there writes in the group while the groups are open', async () => {
		contacts.set('p', contact({ participantId: 'p', committeeId: 'ga' }));
		expect(
			await service.chatWriteRefusal({
				chat: gaGroup,
				side: 'PARTICIPANT',
				writerParticipantId: 'p'
			})
		).toBeNull();
	});

	test('a delegate moved to another committee is out of the old group', async () => {
		contacts.set('p', contact({ participantId: 'p', committeeId: 'sc' }));
		expect(
			await service.chatWriteRefusal({
				chat: gaGroup,
				side: 'PARTICIPANT',
				writerParticipantId: 'p'
			})
		).toBe('NOT_SEATED');
	});

	test('the groups wait for their switch, the team does not', async () => {
		contacts.set('p', contact({ participantId: 'p', committeeId: 'ga' }));
		query.conference.findFirst.mockResolvedValue({ ...flags, groupChatsEnabled: false });
		expect(
			await service.chatWriteRefusal({
				chat: gaGroup,
				side: 'PARTICIPANT',
				writerParticipantId: 'p'
			})
		).toBe('GROUPS_DISABLED');
		expect(
			await service.chatWriteRefusal({ chat: gaGroup, side: 'TEAM', writerParticipantId: null })
		).toBeNull();
	});

	test('a block closes a direct chat', async () => {
		contacts.set('p', contact({ participantId: 'p' }));
		contacts.set('q', contact({ participantId: 'q' }));
		query.conference.findFirst.mockResolvedValue({ ...flags, messagingEnabled: true });
		query.chatBlock.findFirst.mockResolvedValue({ id: 'block' });
		const direct = {
			...baseChat,
			kind: 'DIRECT' as const,
			participantId: 'p',
			otherParticipantId: 'q'
		};
		expect(
			await service.chatWriteRefusal({
				chat: direct,
				side: 'PARTICIPANT',
				writerParticipantId: 'p'
			})
		).toBe('BLOCKED');
	});

	test('a conference that does not exist answers NOT_FOUND', async () => {
		query.conference.findFirst.mockResolvedValue(undefined);
		await expect(
			service.chatWriteRefusal({ chat: gaGroup, side: 'TEAM', writerParticipantId: null })
		).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
	});
});

describe('the inboxes reaching a participant', () => {
	const person = (userId: string, givenName: string) => ({
		userId,
		user: { givenName, familyName: 'Team' }
	});
	beforeEach(() => {
		query.teamFunction.findMany.mockResolvedValue([
			{
				id: 'f-chair',
				kind: 'CHAIR',
				committee: { id: 'ga', abbreviation: 'GA', name: 'Generalversammlung' },
				role: null,
				teamMember: person('chair', 'Chris')
			},
			{
				id: 'f-press',
				kind: 'ROLE_SUPPORT',
				committee: null,
				role: { id: 'press', name: 'Presse', icon: 'newspaper' },
				teamMember: person('lena', 'Lena')
			},
			{
				id: 'f-jury',
				kind: 'ROLE_SUPPORT',
				committee: null,
				role: { id: 'jury', name: 'Jury', icon: null },
				teamMember: person('jan', 'Jan')
			},
			{
				id: 'f-trust',
				kind: 'TRUSTED_PERSON',
				committee: null,
				role: null,
				teamMember: person('tessa', 'Tessa')
			},
			// an account gone: no trusted person to name
			{
				id: 'f-gone',
				kind: 'TRUSTED_PERSON',
				committee: null,
				role: null,
				teamMember: { userId: 'x', user: null }
			}
		]);
	});
	const reaching = async () =>
		(await service.inboxesReaching({ conferenceId: 'c1', participantId: 'p' })).map(
			(option) =>
				`${option.inbox}:${option.committee?.id ?? option.role?.id ?? option.person?.userId ?? ''}`
		);

	test("somebody holding a custom role reaches its support and every committee's chairs", async () => {
		contacts.set('p', contact({ participantId: 'p', roleId: 'press', kind: 'CUSTOM' }));
		expect(await reaching()).toEqual([
			'PARTICIPANT_CARE:',
			'TRUSTED_PERSON:',
			'TRUSTED_PERSON:tessa',
			'CHAIR:ga',
			'ROLE_SUPPORT:press'
		]);
	});

	test('before the release only participant care and the trusted persons', async () => {
		contacts.set('p', contact({ participantId: 'p', roleId: 'press', kind: 'CUSTOM' }));
		query.conference.findFirst.mockResolvedValue({ ...flags, assignmentReleased: false });
		expect(await reaching()).toEqual([
			'PARTICIPANT_CARE:',
			'TRUSTED_PERSON:',
			'TRUSTED_PERSON:tessa'
		]);
	});

	test("a role's inbox opens for its people and refuses everybody else", async () => {
		contacts.set('p', contact({ participantId: 'p', roleId: 'press', kind: 'CUSTOM' }));
		const existing = { ...baseChat, kind: 'TEAM' as const, inbox: 'ROLE_SUPPORT' as const };
		query.chat.findFirst.mockResolvedValue(existing);
		const open = (roleId: string) =>
			service.openTeamChat({
				conferenceId: 'c1',
				participantId: 'p',
				inbox: 'ROLE_SUPPORT',
				committeeId: null,
				roleId
			});
		expect(await open('press')).toBe(existing);
		await expect(open('jury')).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
	});
});

describe('openGroupChat', () => {
	test('opens the group the first time and announces it', async () => {
		query.chat.findFirst.mockResolvedValue(undefined);
		inserts = [[gaGroup]];
		expect(await service.openGroupChat({ conferenceId: 'c1', group: { committeeId: 'ga' } })).toBe(
			gaGroup
		);
		expect(chatPubsub.created).toHaveBeenCalledOnce();
	});

	test('finds the group somebody else opened at the same moment', async () => {
		query.chat.findFirst.mockResolvedValueOnce(undefined).mockResolvedValueOnce(pressGroup);
		inserts = [[]];
		expect(await service.openGroupChat({ conferenceId: 'c1', group: { roleId: 'press' } })).toBe(
			pressGroup
		);
		expect(chatPubsub.created).not.toHaveBeenCalled();
	});

	test('answers CONFLICT when the group can be neither made nor found', async () => {
		query.chat.findFirst.mockResolvedValue(undefined);
		inserts = [[]];
		await expect(
			service.openGroupChat({ conferenceId: 'c1', group: { roleId: 'press' } })
		).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
	});
});

describe('sendMessage', () => {
	const send = (chat: ChatRow, author: Parameters<typeof service.sendMessage>[0]['author']) =>
		service.sendMessage({ chat, author, body: 'Hallo', paperId: null, origin: 'https://app' });

	test('a participant writing in a group tells its team on Slack', async () => {
		contacts.set('p', contact({ participantId: 'p', committeeId: 'ga' }));
		inserts = [[{ id: 'm1' }], []];
		expect(await send(gaGroup, { side: 'PARTICIPANT', participantId: 'p', userId: 'u-p' })).toBe(
			'm1'
		);
		expect(tellGroupOnSlack).toHaveBeenCalledWith(expect.objectContaining({ messageId: 'm1' }));
		expect(chatMessagePubsub.created).toHaveBeenCalledOnce();
		// the first message brings the group into the lists
		expect(chatPubsub.created).toHaveBeenCalledOnce();
	});

	test('the team writing in a group tells nobody on Slack', async () => {
		inserts = [[{ id: 'm2' }], []];
		const written = { ...gaGroup, lastMessageAt: new Date() };
		expect(await send(written, { side: 'TEAM', userId: 'chair' })).toBe('m2');
		expect(tellGroupOnSlack).not.toHaveBeenCalled();
		expect(chatPubsub.created).not.toHaveBeenCalled();
	});

	test('the team answering from an inbox reads it for the inbox', async () => {
		inserts = [[{ id: 'm3' }]];
		const teamChat = { ...baseChat, kind: 'TEAM' as const, inbox: 'PARTICIPANT_CARE' as const };
		expect(await send(teamChat, { side: 'TEAM', userId: 'care' })).toBe('m3');
		expect(tellInboxOnSlack).not.toHaveBeenCalled();
	});

	test('refused (CONFLICT) where the writer may not write', async () => {
		contacts.set('p', contact({ participantId: 'p', committeeId: 'sc' }));
		await expect(
			send(gaGroup, { side: 'PARTICIPANT', participantId: 'p', userId: 'u-p' })
		).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
	});

	test('a paper is attached to a team chat only', async () => {
		query.paper.findFirst.mockResolvedValue({ id: 'paper' });
		await expect(
			service.sendMessage({
				chat: gaGroup,
				author: { side: 'TEAM', userId: 'chair' },
				body: 'Zum Papier',
				paperId: 'paper',
				origin: 'https://app'
			})
		).rejects.toMatchObject({ extensions: { code: 'INVALID_INPUT' } });
	});

	test('fails loudly when the message was not stored', async () => {
		inserts = [[]];
		await expect(send(gaGroup, { side: 'TEAM', userId: 'chair' })).rejects.toThrow(
			'returned no row'
		);
	});
});

describe('earlierReportCount and setMessagingSuspended', () => {
	test('counts the settled reports of the chats a person takes part in', async () => {
		selects = [[{ reports: 3 }]];
		expect(
			await service.earlierReportCount({
				participantId: 'p',
				userId: 'u-p',
				delegationId: 'd',
				committeeId: 'ga',
				roleId: 'press'
			})
		).toBe(3);
		selects = [[]];
		expect(
			await service.earlierReportCount({ participantId: 'p', userId: 'u-p', delegationId: null })
		).toBe(0);
	});

	test('suspending a person announces their chats and the group of their seat', async () => {
		contacts.set('p', contact({ participantId: 'p', roleId: 'press', kind: 'CUSTOM' }));
		updates = [[{ conferenceId: 'c1' }]];
		query.chat.findMany.mockResolvedValue([{ id: 'direct' }, { id: 'press-group' }]);
		await service.setMessagingSuspended({ participantId: 'p', suspended: true });
		expect(chatPubsub.updated).toHaveBeenCalledWith(['direct', 'press-group']);

		contacts.set('q', contact({ participantId: 'q', committeeId: 'ga' }));
		updates = [[{ conferenceId: 'c1' }]];
		query.chat.findMany.mockResolvedValue([]);
		await service.setMessagingSuspended({ participantId: 'q', suspended: false });
		expect(chatPubsub.updated).toHaveBeenCalledOnce();
	});

	test('suspending nobody answers NOT_FOUND', async () => {
		updates = [[]];
		await expect(
			service.setMessagingSuspended({ participantId: 'gone', suspended: true })
		).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
	});
});

describe('muting and unread counts', () => {
	test('a muted group counts nothing unread for whoever muted it', async () => {
		query.chatMute.findMany.mockResolvedValue([{ chatId: 'chat', userId: 'u-p' }]);
		expect(await service.unreadCount({ userId: 'u-p', side: 'PARTICIPANT', chat: gaGroup })).toBe(
			0
		);
	});

	test('a group is read by each of its people, the team too', async () => {
		selects = [[{ chatId: 'chat', unread: 2 }]];
		expect(await service.unreadCount({ userId: 'chair', side: 'TEAM', chat: gaGroup })).toBe(2);
	});

	test('a team chat counts what its inbox has not read; reviewing counts nothing', async () => {
		selects = [[{ chatId: 'inbox-chat', unread: 4 }]];
		const teamChat = { id: 'inbox-chat', kind: 'TEAM' as const };
		expect(await service.unreadCount({ userId: 'care', side: 'TEAM', chat: teamChat })).toBe(4);
		expect(await service.unreadCount({ userId: 'care', side: 'REVIEW', chat: gaGroup })).toBe(0);
	});

	test('only groups are muted, and muting announces the chat', async () => {
		await service.setChatMuted({ chat: gaGroup, userId: 'u-p', muted: true });
		await service.setChatMuted({ chat: gaGroup, userId: 'u-p', muted: false });
		expect(chatPubsub.updated).toHaveBeenCalledTimes(2);
		await expect(
			service.setChatMuted({ chat: { ...baseChat, kind: 'DIRECT' }, userId: 'u-p', muted: true })
		).rejects.toMatchObject({ extensions: { code: 'INVALID_INPUT' } });
	});
});

describe('groupArgsSchema', () => {
	test('names exactly one committee or role', () => {
		expect(service.groupArgsSchema.safeParse({ committeeId: 'ga' }).success).toBe(true);
		expect(service.groupArgsSchema.safeParse({ roleId: 'press' }).success).toBe(true);
		expect(service.groupArgsSchema.safeParse({}).success).toBe(false);
		expect(service.groupArgsSchema.safeParse({ committeeId: 'ga', roleId: 'press' }).success).toBe(
			false
		);
	});
});

describe('the arguments of a team chat and its author', () => {
	test('names the inbox, with the one trusted person by their account', async () => {
		query.teamFunction.findFirst.mockResolvedValue({ teamMember: { userId: 'tessa' } });
		expect(
			await service.teamChatTarget({
				conferenceId: 'c1',
				inbox: 'TRUSTED_PERSON',
				trustedPersonId: 'f'
			})
		).toEqual({
			conferenceId: 'c1',
			inbox: 'TRUSTED_PERSON',
			committeeId: null,
			roleId: null,
			trustedUserId: 'tessa'
		});
		expect(
			await service.teamChatTarget({ conferenceId: 'c1', inbox: 'ROLE_SUPPORT', roleId: 'press' })
		).toMatchObject({ roleId: 'press', trustedUserId: null });
	});

	test('a trusted person nobody is any more answers CONFLICT', async () => {
		query.teamFunction.findFirst.mockResolvedValue(undefined);
		await expect(
			service.teamChatTarget({ conferenceId: 'c1', inbox: 'TRUSTED_PERSON', trustedPersonId: 'f' })
		).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
	});

	test('a party writes as themselves, everybody else as the team', () => {
		expect(service.messageAuthor({ side: 'PARTICIPANT', participantId: 'p', userId: 'u' })).toEqual(
			{
				side: 'PARTICIPANT',
				participantId: 'p',
				userId: 'u'
			}
		);
		expect(
			service.messageAuthor({ side: 'PARTICIPANT', participantId: null, userId: 'u' })
		).toEqual({
			side: 'TEAM',
			userId: 'u'
		});
		expect(service.messageAuthor({ side: 'TEAM', participantId: 'p', userId: 'u' })).toEqual({
			side: 'TEAM',
			userId: 'u'
		});
	});
});
