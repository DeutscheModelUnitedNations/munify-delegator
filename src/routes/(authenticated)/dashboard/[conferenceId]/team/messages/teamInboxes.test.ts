import { describe, expect, test } from 'vitest';
import {
	inboxFilter,
	inboxFilterRows,
	inboxGroups,
	inboxKey,
	inboxesOf,
	listedChats,
	unreadByInbox
} from './teamInboxes';

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

describe('inbox groups', () => {
	const inboxes = inboxesOf({
		cares: true,
		functions: [
			fn('CHAIR', 'ga', 'GV'),
			fn('CHAIR', 'sc', 'SR'),
			fn('CONSULTANT', 'ga', 'GV'),
			{ kind: 'TRUSTED_PERSON' as const }
		]
	});
	const groups = inboxGroups(inboxes);

	test('one group per kind, a lone inbox keyed by itself and several by their kind', () => {
		expect(groups.map((group) => [group.key, group.inboxes.length])).toEqual([
			['PARTICIPANT_CARE', 1],
			['group:TRUSTED_PERSON', 2],
			['group:CHAIR', 2],
			['CONSULTANT:ga', 1]
		]);
	});

	test('a kind narrows to all its inboxes', () => {
		const filter = inboxFilter({ groups, selected: 'group:CHAIR' });
		expect(filter?.inbox).toBeNull();
		expect([...(filter?.keys ?? [])]).toEqual(['CHAIR:ga', 'CHAIR:sc']);
	});

	test('an inbox narrows to itself, within its group', () => {
		const filter = inboxFilter({ groups, selected: 'CHAIR:sc' });
		expect(filter?.group.key).toBe('group:CHAIR');
		expect(filter?.inbox?.key).toBe('CHAIR:sc');
		expect([...(filter?.keys ?? [])]).toEqual(['CHAIR:sc']);
	});

	test('the shared trusted inbox is not mistaken for the kind', () => {
		const filter = inboxFilter({ groups, selected: 'TRUSTED_PERSON' });
		expect([...(filter?.keys ?? [])]).toEqual(['TRUSTED_PERSON']);
	});

	test('a key naming nothing the caller answers narrows nothing', () => {
		expect(inboxFilter({ groups, selected: 'CHAIR:gone' })).toBeNull();
		expect(inboxFilter({ groups, selected: 'group:CONSULTANT' })).toBeNull();
		expect(inboxFilter({ groups, selected: null })).toBeNull();
	});
});

describe('the inbox filter rows', () => {
	const groups = inboxGroups(
		inboxesOf({
			cares: true,
			functions: [fn('CHAIR', 'ga', 'GV'), fn('CHAIR', 'sc', 'SR')]
		})
	);
	const unreadOf = new Map([
		['CHAIR:ga', 2],
		['CHAIR:sc', 1],
		['PARTICIPANT_CARE', 4]
	]);

	test('with nothing chosen offers the kinds, with their unread, and no second row', () => {
		const rows = inboxFilterRows({ groups, selected: null, unreadOf });
		expect(rows.kinds?.all.pressed).toBe(true);
		expect(rows.kinds?.groups.map(({ target, unread }) => [target, unread])).toEqual([
			['PARTICIPANT_CARE', 4],
			['group:CHAIR', 3]
		]);
		expect(rows.members).toBeNull();
	});

	test('a kind chosen offers its inboxes, and pressing it again lets go', () => {
		const rows = inboxFilterRows({ groups, selected: 'group:CHAIR', unreadOf });
		expect(rows.kinds?.groups.map(({ pressed, target }) => [pressed, target])).toEqual([
			[false, 'PARTICIPANT_CARE'],
			[true, null]
		]);
		expect(rows.members?.all).toEqual({ pressed: true, target: 'group:CHAIR', unread: 0 });
		expect(
			rows.members?.inboxes.map(({ pressed, target, unread }) => [pressed, target, unread])
		).toEqual([
			[false, 'CHAIR:ga', 2],
			[false, 'CHAIR:sc', 1]
		]);
	});

	test('an inbox chosen is pressed, and pressing it again goes back to its kind', () => {
		const rows = inboxFilterRows({ groups, selected: 'CHAIR:sc', unreadOf });
		expect(rows.members?.all.pressed).toBe(false);
		expect(rows.members?.inboxes.map(({ pressed, target }) => [pressed, target])).toEqual([
			[false, 'CHAIR:ga'],
			[true, 'group:CHAIR']
		]);
	});

	test('with one kind only there is no first row and "all" is the whole list', () => {
		const chairs = groups.filter((group) => group.kind === 'CHAIR');
		const rows = inboxFilterRows({ groups: chairs, selected: 'CHAIR:ga', unreadOf });
		expect(rows.kinds).toBeNull();
		expect(rows.members?.all).toEqual({ pressed: false, target: null, unread: 0 });
		expect(rows.members?.inboxes[0]?.target).toBeNull();
	});

	test('a kind of one inbox gets no second row', () => {
		const rows = inboxFilterRows({ groups, selected: 'PARTICIPANT_CARE', unreadOf });
		expect(rows.members).toBeNull();
	});
});
