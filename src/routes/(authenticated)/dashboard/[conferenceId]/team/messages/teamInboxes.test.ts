import { describe, expect, test } from 'vitest';
import { inboxKey, inboxesOf, listedChats, unreadByInbox } from './teamInboxes';

const fn = (kind: 'CHAIR' | 'CONSULTANT', committeeId: string, abbreviation: string) => ({
	kind,
	committeeId,
	committee: { abbreviation }
});

describe('inboxesOf', () => {
	test('lists participant care first, then the functions by committee', () => {
		const inboxes = inboxesOf({
			cares: true,
			functions: [
				fn('CONSULTANT', 'sc', 'SR'),
				fn('CONSULTANT', 'ga', 'GV'),
				fn('CHAIR', 'ga', 'GV')
			]
		});
		expect(inboxes.map((inbox) => inbox.key)).toEqual([
			'PARTICIPANT_CARE',
			'CHAIR:ga',
			'CONSULTANT:ga',
			'CONSULTANT:sc'
		]);
	});

	test('a trusted person answers the shared inbox and their own', () => {
		const inboxes = inboxesOf({
			cares: true,
			functions: [fn('CHAIR', 'ga', 'GV'), { kind: 'TRUSTED_PERSON', committeeId: null }]
		});
		expect(inboxes.map((inbox) => [inbox.key, inbox.own])).toEqual([
			['PARTICIPANT_CARE', false],
			['TRUSTED_PERSON', false],
			['TRUSTED_PERSON:own', true],
			['CHAIR:ga', false]
		]);
	});

	test('somebody without care role or function answers nothing', () => {
		expect(inboxesOf({ cares: false, functions: [] })).toEqual([]);
	});
});

describe('a system admin', () => {
	test("reads participant care's inbox and both inboxes of every committee", () => {
		const inboxes = inboxesOf({
			cares: true,
			functions: [],
			isAdmin: true,
			committees: [
				{ id: 'sc', abbreviation: 'SR' },
				{ id: 'ga', abbreviation: 'GV' }
			]
		});
		expect(inboxes.map((inbox) => inbox.key)).toEqual([
			'PARTICIPANT_CARE',
			'CHAIR:ga',
			'CONSULTANT:ga',
			'CHAIR:sc',
			'CONSULTANT:sc'
		]);
	});
});

describe('unreadByInbox', () => {
	test('adds up the unread messages of each inbox', () => {
		const unread = unreadByInbox([
			{ inbox: 'CHAIR', committeeId: 'ga', unreadCount: 2 },
			{ inbox: 'CHAIR', committeeId: 'ga', unreadCount: 1 },
			{ inbox: 'PARTICIPANT_CARE', unreadCount: 4 }
		]);
		expect(unread.get('CHAIR:ga')).toBe(3);
		expect(unread.get('PARTICIPANT_CARE')).toBe(4);
		expect(unread.get('CONSULTANT:ga')).toBeUndefined();
	});
});

describe('inboxKey', () => {
	test('matches a chat to the inbox it belongs to', () => {
		expect(inboxKey({ inbox: 'CHAIR', committeeId: 'ga' })).toBe('CHAIR:ga');
		expect(inboxKey({ inbox: 'PARTICIPANT_CARE', committeeId: null })).toBe('PARTICIPANT_CARE');
	});

	test('keeps a chat written to one trusted person apart from the shared inbox', () => {
		expect(inboxKey({ inbox: 'TRUSTED_PERSON' })).toBe('TRUSTED_PERSON');
		expect(inboxKey({ inbox: 'TRUSTED_PERSON', trustedPersonName: 'Anna Meier' })).toBe(
			'TRUSTED_PERSON:own'
		);
	});
});

describe('listedChats', () => {
	const chats = [
		{ id: 'a', archived: false },
		{ id: 'b', archived: true },
		{ id: 'c', archived: false }
	];

	test('leaves the archive out until it is asked for, and counts it', () => {
		const listed = listedChats({ chats, showArchive: false });
		expect(listed.chats.map((chat) => chat.id)).toEqual(['a', 'c']);
		expect(listed.archived).toBe(1);
	});

	test('shows the archived chats after the open ones', () => {
		const listed = listedChats({ chats, showArchive: true });
		expect(listed.chats.map((chat) => chat.id)).toEqual(['a', 'c', 'b']);
		expect(listed.archived).toBe(1);
	});

	test('counts none in an inbox without an archive', () => {
		expect(listedChats({ chats: [], showArchive: true })).toEqual({ chats: [], archived: 0 });
	});
});
