import { describe, expect, test } from 'vitest';
import {
	bubblesOf,
	firstUnreadId,
	followStep,
	messageAuthor,
	placeReports,
	runsOf,
	scrollBehaviorFor,
	standsOnOwnSide,
	unreadStateOf,
	type ThreadChat
} from './threadMessages';

const germany = {
	participantId: 'p-deu',
	roleKind: 'NATION',
	nationAlpha3Code: 'deu',
	committeeAbbreviation: 'GV'
};
const france = { ...germany, participantId: 'p-fra', nationAlpha3Code: 'fra' };

const direct: ThreadChat = { kind: 'DIRECT', participantId: 'p-deu', contacts: [france] };
const teamChat: ThreadChat = {
	kind: 'TEAM',
	inbox: 'CHAIR',
	committee: { abbreviation: 'GV' },
	participantId: 'p-deu',
	contacts: [germany]
};

const fromParticipant = (id: string, mine = false, authorParticipantId = 'p-fra') => ({
	id,
	fromTeam: false,
	mine,
	authorParticipantId
});
const fromTeam = (id: string, authorName: string | null = 'Chris Chair') => ({
	id,
	fromTeam: true,
	mine: false,
	authorName
});

describe('standsOnOwnSide', () => {
	test('a participant has their own messages on their side', () => {
		const args = { side: 'PARTICIPANT' as const, chat: direct };
		expect(standsOnOwnSide({ ...args, message: fromParticipant('a', true) })).toBe(true);
		expect(standsOnOwnSide({ ...args, message: fromParticipant('b') })).toBe(false);
	});

	test('the team has every message from the inbox on its side, whoever wrote it', () => {
		const args = { side: 'TEAM' as const, chat: teamChat };
		expect(standsOnOwnSide({ ...args, message: fromTeam('a') })).toBe(true);
		expect(standsOnOwnSide({ ...args, message: fromParticipant('b') })).toBe(false);
	});

	test('reviewing, the two parties stand on opposite sides', () => {
		const args = { side: 'REVIEW' as const, chat: direct };
		expect(standsOnOwnSide({ ...args, message: fromParticipant('a', false, 'p-deu') })).toBe(false);
		expect(standsOnOwnSide({ ...args, message: fromParticipant('b') })).toBe(true);
	});
});

describe('messageAuthor', () => {
	test('a direct chat names nobody: the parties know each other by role', () => {
		expect(
			messageAuthor({ message: fromParticipant('a'), side: 'PARTICIPANT', chat: direct })
		).toBeUndefined();
	});

	test('a message from an inbox carries the function and the name', () => {
		const args = { side: 'PARTICIPANT' as const, chat: teamChat };
		expect(messageAuthor({ ...args, message: fromTeam('a') })).toBe('Vorsitz · GV · Chris Chair');
		// the account is gone: the function still says who answered
		expect(messageAuthor({ ...args, message: fromTeam('b', null) })).toBe('Vorsitz · GV');
	});

	test('a delegation group and a review name the role and, where known, the person', () => {
		const group: ThreadChat = { kind: 'DELEGATION', contacts: [] };
		expect(
			messageAuthor({
				message: { ...fromParticipant('a'), authorName: 'Anna Alpha' },
				side: 'PARTICIPANT',
				chat: group
			})
		).toBe('Anna Alpha');
		expect(
			messageAuthor({
				message: { ...fromParticipant('b'), authorName: 'Carla Gamma' },
				side: 'REVIEW',
				chat: direct
			})
		).toBe('Frankreich · GV · Carla Gamma');
	});
});

describe('bubblesOf', () => {
	test('names the author once per run and never above a participant’s own messages', () => {
		const bubbles = bubblesOf({
			messages: [
				fromParticipant('q', true, 'p-deu'),
				fromTeam('a1'),
				fromTeam('a2'),
				fromTeam('a3', 'Rita Reviewer')
			],
			side: 'PARTICIPANT',
			chat: teamChat
		});
		expect(bubbles.map(({ own, author, continues }) => ({ own, author, continues }))).toEqual([
			{ own: true, author: undefined, continues: false },
			{ own: false, author: 'Vorsitz · GV · Chris Chair', continues: false },
			{ own: false, author: undefined, continues: true },
			// another team member answering starts a new run
			{ own: false, author: 'Vorsitz · GV · Rita Reviewer', continues: false }
		]);
	});

	test('on the team side, colleagues’ answers are named too', () => {
		const [bubble] = bubblesOf({ messages: [fromTeam('a')], side: 'TEAM', chat: teamChat });
		expect(bubble).toMatchObject({ own: true, author: 'Vorsitz · GV · Chris Chair' });
	});
});

describe('runsOf', () => {
	const at = (minute: number) => new Date(Date.UTC(2026, 10, 19, 10, minute));
	const timed = (id: string, minute: number, mine = false) => ({
		...fromParticipant(id, mine, mine ? 'p-deu' : 'p-fra'),
		createdAt: at(minute)
	});
	const runs = (messages: ReturnType<typeof timed>[], breaksBefore: string[] = []) =>
		runsOf({
			bubbles: bubblesOf({ messages, side: 'PARTICIPANT', chat: direct }),
			breaksBefore
		}).map((run) => run.messages.map((message) => message.id));

	test('puts what one author writes in a row into one bubble', () => {
		expect(runs([timed('a', 0), timed('b', 1), timed('c', 3)])).toEqual([['a', 'b', 'c']]);
	});

	test('starts a new bubble after a pause, for another author, and below a line', () => {
		expect(runs([timed('a', 0), timed('b', 10)])).toEqual([['a'], ['b']]);
		expect(runs([timed('a', 0), timed('b', 1, true)])).toEqual([['a'], ['b']]);
		expect(runs([timed('a', 0), timed('b', 1)], ['b'])).toEqual([['a'], ['b']]);
	});

	test('a bubble after a pause still sits close to the one before', () => {
		const [, later] = runsOf({
			bubbles: bubblesOf({
				messages: [timed('a', 0), timed('b', 10)],
				side: 'PARTICIPANT',
				chat: direct
			}),
			breaksBefore: []
		});
		expect(later).toMatchObject({ key: 'b', continues: true });
	});
});

describe('unreadStateOf', () => {
	const chat = { id: 'chat', unreadCount: 2 };

	test('names the chat and its newest message while something is unread', () => {
		expect(unreadStateOf({ chat, side: 'PARTICIPANT', newestId: 'm7' })).toBe('chat:m7');
		expect(unreadStateOf({ chat, side: 'TEAM', newestId: 'm8' })).toBe('chat:m8');
	});

	test('has nothing to mark without a chat, when all is read, or while only reviewing', () => {
		expect(unreadStateOf({ chat: null, side: 'PARTICIPANT', newestId: 'm7' })).toBeNull();
		expect(
			unreadStateOf({ chat: { id: 'chat', unreadCount: 0 }, side: 'TEAM', newestId: 'm7' })
		).toBeNull();
		expect(unreadStateOf({ chat, side: 'REVIEW', newestId: 'm7' })).toBeNull();
	});
});

describe('firstUnreadId', () => {
	const messages = [
		fromParticipant('a'),
		fromParticipant('b', true),
		fromParticipant('c'),
		fromTeam('d'),
		fromParticipant('e')
	];

	test('is the oldest of the latest unread messages of the other side', () => {
		const args = { messages, side: 'PARTICIPANT' as const, chat: direct };
		expect(firstUnreadId({ ...args, unreadCount: 1 })).toBe('e');
		expect(firstUnreadId({ ...args, unreadCount: 3 })).toBe('c');
	});

	test('an inbox counts what the participant wrote', () => {
		expect(firstUnreadId({ messages, side: 'TEAM', chat: teamChat, unreadCount: 2 })).toBe('c');
	});

	test('is the oldest loaded message when more are unread than loaded', () => {
		expect(firstUnreadId({ messages, side: 'PARTICIPANT', chat: direct, unreadCount: 40 })).toBe(
			'a'
		);
	});

	test('marks nothing when all is read or while only reviewing', () => {
		const args = { messages, chat: direct };
		expect(firstUnreadId({ ...args, side: 'PARTICIPANT', unreadCount: 0 })).toBeUndefined();
		expect(firstUnreadId({ ...args, side: 'REVIEW', unreadCount: 2 })).toBeUndefined();
		expect(
			firstUnreadId({ messages: [], side: 'TEAM', chat: teamChat, unreadCount: 2 })
		).toBeUndefined();
	});
});

describe('a reviewed delegation group', () => {
	test('has no sides: everybody stands on the left', () => {
		const chat = { kind: 'DELEGATION' as const, participantId: null, contacts: [] };
		const message = { id: 'm', mine: false, fromTeam: false, authorParticipantId: 'p1' };
		expect(standsOnOwnSide({ message, side: 'REVIEW', chat })).toBe(false);
	});
});

describe('placeReports', () => {
	const messages = [
		{ id: 'a', createdAt: new Date(2026, 10, 12, 21, 0) },
		{ id: 'b', createdAt: new Date(2026, 10, 12, 21, 30) },
		{ id: 'c', createdAt: new Date(2026, 10, 14, 9, 0) }
	];
	const report = (id: string, createdAt: Date) => ({ id, createdAt });

	test('puts a report above the first message written after it, in that day', () => {
		const early = report('r1', new Date(2026, 10, 12, 20, 0));
		const between = report('r2', new Date(2026, 10, 12, 21, 20));
		const placed = placeReports({ messages, reports: [early, between] });
		expect(placed.above.get('a')).toEqual({ beforeDay: [], inDay: [early] });
		expect(placed.above.get('b')).toEqual({ beforeDay: [], inDay: [between] });
		expect(placed.after).toEqual([]);
	});

	test('a report from a quieter day stands above the next day’s heading', () => {
		const quiet = report('r', new Date(2026, 10, 13, 12, 0));
		expect(placeReports({ messages, reports: [quiet] }).above.get('c')).toEqual({
			beforeDay: [quiet],
			inDay: []
		});
	});

	test('a report after the last message closes the thread', () => {
		const late = report('r', new Date(2026, 10, 15, 8, 0));
		expect(placeReports({ messages, reports: [late] }).after).toEqual([late]);
		expect(placeReports({ messages: [], reports: [late] }).after).toEqual([late]);
	});
});

describe('followStep', () => {
	const args = {
		key: 'chat:m2',
		seenKey: 'chat:m1',
		nearEnd: false,
		newest: fromParticipant('m2'),
		side: 'PARTICIPANT' as const,
		chat: direct
	};

	test('does nothing while the newest message stays the same', () => {
		expect(followStep({ ...args, seenKey: 'chat:m2' })).toBe('stay');
	});

	test('opens the thread the first time', () => {
		expect(followStep({ ...args, seenKey: '' })).toBe('open');
	});

	test('follows a new message while the reader is near the end', () => {
		expect(followStep({ ...args, nearEnd: true })).toBe('follow');
	});

	test('follows the reader’s own message from anywhere', () => {
		expect(followStep({ ...args, newest: fromParticipant('m2', true) })).toBe('follow');
	});

	test('flags someone else’s message while the reader is further up', () => {
		expect(followStep(args)).toBe('flag');
		expect(followStep({ ...args, newest: undefined })).toBe('flag');
		expect(followStep({ ...args, chat: null })).toBe('flag');
	});
});

describe('scrollBehaviorFor', () => {
	test('glides only when following and motion is welcome', () => {
		expect(scrollBehaviorFor({ opening: false, reducedMotion: false })).toBe('smooth');
		expect(scrollBehaviorFor({ opening: true, reducedMotion: false })).toBe('instant');
		expect(scrollBehaviorFor({ opening: false, reducedMotion: true })).toBe('instant');
	});
});

describe('the group of a committee or role', () => {
	const group: ThreadChat = {
		kind: 'COMMITTEE',
		committee: { abbreviation: 'GV' },
		participantId: null,
		contacts: [germany, france]
	};

	test('everybody in it, the team too, has their own messages on their side', () => {
		const mineFromTeam = { ...fromTeam('t1'), mine: true };
		expect(standsOnOwnSide({ message: mineFromTeam, side: 'TEAM', chat: group })).toBe(true);
		expect(standsOnOwnSide({ message: fromTeam('t2'), side: 'TEAM', chat: group })).toBe(false);
		expect(
			standsOnOwnSide({ message: fromParticipant('m', true), side: 'PARTICIPANT', chat: group })
		).toBe(true);
		expect(standsOnOwnSide({ message: fromParticipant('m'), side: 'REVIEW', chat: group })).toBe(
			false
		);
	});

	test('participants are named by their role, the team by name', () => {
		expect(messageAuthor({ message: fromParticipant('m'), side: 'PARTICIPANT', chat: group })).toBe(
			'Frankreich · GV'
		);
		expect(messageAuthor({ message: fromTeam('t'), side: 'PARTICIPANT', chat: group })).toBe(
			'Team · Chris Chair'
		);
	});

	test('somebody no longer seated there still reads as somebody', () => {
		expect(
			messageAuthor({
				message: fromParticipant('m', false, 'p-gone'),
				side: 'PARTICIPANT',
				chat: group
			})
		).toBe('Person ohne Rolle');
	});

	test("a role's inbox names the role its team answers for", () => {
		const roleInbox: ThreadChat = {
			kind: 'TEAM',
			inbox: 'ROLE_SUPPORT',
			role: { name: 'Presse' },
			participantId: 'p-press',
			contacts: []
		};
		expect(messageAuthor({ message: fromTeam('t'), side: 'PARTICIPANT', chat: roleInbox })).toBe(
			'Betreuung Presse · Chris Chair'
		);
	});
});
