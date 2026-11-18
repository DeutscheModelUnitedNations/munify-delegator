import { describe, expect, test } from 'vitest';
import type { TeamAccess } from '#lib/helpers/teamAccess';
import { mayAskFor, NOTHING_WAITING, waitingItems, type WaitingCounts } from './teamWaiting';

const as = (...roles: TeamAccess['roles']): TeamAccess => ({ isAdmin: false, roles });
const everything: WaitingCounts = {
	unreadMessages: 3,
	reportedChats: 1,
	openDuplicates: 2,
	schoolSuggestions: 4,
	openEmails: 5,
	draftAnnouncements: 6
};
const ids = ({ counts, access }: { counts: WaitingCounts; access: TeamAccess }) =>
	waitingItems({ counts, access }).map((item) => item.id);

describe('waitingItems', () => {
	test('lists nothing while nothing waits', () => {
		expect(waitingItems({ counts: NOTHING_WAITING, access: { isAdmin: true, roles: [] } })).toEqual(
			[]
		);
	});

	test('lists everything for an admin, reports first', () => {
		expect(ids({ counts: everything, access: { isAdmin: true, roles: [] } })).toEqual([
			'reportedChats',
			'unreadMessages',
			'openDuplicates',
			'schoolSuggestions',
			'openEmails',
			'draftAnnouncements'
		]);
	});

	test('leaves out what is zero', () => {
		const counts = { ...NOTHING_WAITING, openDuplicates: 1 };
		expect(ids({ counts, access: as('PARTICIPANT_CARE') })).toEqual(['openDuplicates']);
	});

	test('never links a page the caller may not open', () => {
		// a reviewer answers inboxes, but neither cares for participants nor writes announcements
		expect(ids({ counts: everything, access: as('REVIEWER') })).toEqual([
			'reportedChats',
			'unreadMessages'
		]);
		// the content lead writes announcements but sees none of the care pages
		expect(ids({ counts: everything, access: as('CONTENT_LEAD') })).toEqual([
			'reportedChats',
			'unreadMessages',
			'draftAnnouncements'
		]);
	});

	test('opens the reports of the messages page, and the inboxes for the unread', () => {
		const [reports, unread] = waitingItems({ counts: everything, access: as('PARTICIPANT_CARE') });
		expect(reports).toMatchObject({ route: { path: 'team/messages' }, query: 'view=reports' });
		expect(unread).toMatchObject({ route: { path: 'team/messages' } });
		expect(unread?.query).toBeUndefined();
	});

	test('carries the count', () => {
		const [item] = waitingItems({
			counts: { ...NOTHING_WAITING, openEmails: 7 },
			access: as('PROJECT_MANAGEMENT')
		});
		expect(item?.count).toBe(7);
	});
});

describe('mayAskFor', () => {
	test('asks only for what the caller may open', () => {
		expect(mayAskFor({ id: 'openDuplicates', access: as('PARTICIPANT_CARE') })).toBe(true);
		expect(mayAskFor({ id: 'openDuplicates', access: as('REVIEWER') })).toBe(false);
		expect(mayAskFor({ id: 'draftAnnouncements', access: as('CONTENT_LEAD') })).toBe(true);
		expect(mayAskFor({ id: 'draftAnnouncements', access: as('MEMBER') })).toBe(false);
	});
});
