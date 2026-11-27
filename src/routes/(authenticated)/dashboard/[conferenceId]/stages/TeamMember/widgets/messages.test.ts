import { describe, expect, test, vi } from 'vitest';
import { oldestWaiting, unreadByInbox, type WidgetChat } from './messages';
import { waitedFor } from './waited';

vi.mock('#lib/paraglide/runtime', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getLocale: () => 'en'
}));

const chat = (overrides: Partial<WidgetChat>): WidgetChat => ({
	kind: 'TEAM',
	inbox: 'PARTICIPANT_CARE',
	side: 'TEAM',
	unreadCount: 1,
	...overrides
});

describe('unreadByInbox', () => {
	test('sums the unread messages per inbox, most first', () => {
		const counts = unreadByInbox({
			ownChats: 'own',
			chats: [
				chat({ unreadCount: 2 }),
				chat({ inbox: 'CHAIR', committee: { abbreviation: 'GA' }, unreadCount: 5 }),
				chat({ unreadCount: 1 }),
				chat({ kind: 'DIRECT', inbox: null, unreadCount: 1 })
			]
		});
		expect(counts.map((entry) => entry.unread)).toEqual([5, 3, 1]);
		expect(counts.at(-1)?.label).toBe('own');
	});

	test('leaves out read chats and the participant side', () => {
		expect(
			unreadByInbox({
				ownChats: 'own',
				chats: [chat({ unreadCount: 0 }), chat({ side: 'PARTICIPANT', unreadCount: 4 })]
			})
		).toEqual([]);
	});
});

describe('oldestWaiting', () => {
	test("the earliest participant's message among the unread chats", () => {
		expect(
			oldestWaiting([
				chat({ lastParticipantMessageAt: '2027-01-15T10:00:00Z' }),
				chat({ lastParticipantMessageAt: '2027-01-15T09:00:00Z', unreadCount: 0 }),
				chat({ lastParticipantMessageAt: null, lastMessageAt: '2027-01-15T09:30:00Z' })
			])
		).toEqual(new Date('2027-01-15T09:30:00Z'));
	});

	test('nothing without unread chats', () => {
		expect(oldestWaiting([chat({ unreadCount: 0 })])).toBeUndefined();
	});
});

describe('waitedFor', () => {
	const now = new Date('2027-01-15T12:00:00Z');
	test('minutes, then hours, then days', () => {
		expect(waitedFor({ since: new Date('2027-01-15T11:22:00Z'), now })).toBe('38 minutes');
		expect(waitedFor({ since: new Date('2027-01-15T09:00:00Z'), now })).toBe('3 hours');
		expect(waitedFor({ since: new Date('2027-01-12T12:00:00Z'), now })).toBe('3 days');
		expect(waitedFor({ since: now, now })).toBe('1 minute');
	});
});
