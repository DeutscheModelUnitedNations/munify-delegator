import { describe, expect, test } from 'vitest';
import {
	bubblesOf,
	messageAuthor,
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
