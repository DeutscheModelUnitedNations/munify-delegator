import { describe, expect, test } from 'vitest';
import type { TeamAccess } from '#lib/helpers/teamAccess';
import { mayOpen, tilesShownByWidgets, widgetsFor } from './teamWidgets';

const as = (...roles: TeamAccess['roles']): TeamAccess => ({ isAdmin: false, roles });
const admin: TeamAccess = { isAdmin: true, roles: [] };
const ids = (...args: Parameters<typeof widgetsFor>) => widgetsFor(...args).map((w) => w.id);

describe('widgetsFor', () => {
	test('preparation leads with the timeline and the big blocks of the stage', () => {
		expect(widgetsFor({ state: 'PREPARATION', access: admin })).toEqual([
			{ id: 'timeline', size: 'large' },
			{ id: 'readiness', size: 'large' },
			{ id: 'payments', size: 'large' },
			{ id: 'committees', size: 'large' },
			{ id: 'papers', size: 'large' },
			{ id: 'communication', size: 'large' },
			{ id: 'messages', size: 'compact' },
			{ id: 'participants', size: 'compact' }
		]);
	});

	test('the running conference leads with what is on and the entrance', () => {
		expect(ids({ state: 'ACTIVE', access: admin })).toEqual([
			'now',
			'entrance',
			'messages',
			'timeline',
			'payments',
			'papers',
			'communication'
		]);
	});

	test('after the conference the wrap-up comes first', () => {
		expect(ids({ state: 'POST', access: admin })[0]).toBe('wrapUp');
	});

	test('before registration only the timeline, the readiness check and the mails', () => {
		expect(ids({ state: 'PRE', access: admin })).toEqual([
			'timeline',
			'readiness',
			'communication'
		]);
	});

	test('nothing for somebody who is not on the team', () => {
		expect(widgetsFor({ state: 'ACTIVE', access: as() })).toEqual([]);
	});

	test('a plain member sees only what the whole team may open', () => {
		expect(ids({ state: 'ACTIVE', access: as('MEMBER') })).toEqual(['now', 'messages', 'timeline']);
	});

	test('a reviewer sees the papers, given the paper hub', () => {
		expect(
			ids({ state: 'PREPARATION', access: { ...as('REVIEWER'), canSeePaperHub: true } })
		).toEqual(['timeline', 'papers', 'messages']);
		expect(ids({ state: 'PREPARATION', access: as('REVIEWER') })).not.toContain('papers');
	});

	test('the content lead sees the communication widget through the announcements', () => {
		expect(ids({ state: 'PARTICIPANT_REGISTRATION', access: as('CONTENT_LEAD') })).toContain(
			'communication'
		);
		expect(ids({ state: 'PARTICIPANT_REGISTRATION', access: as('CONTENT_LEAD') })).not.toContain(
			'payments'
		);
	});
});

describe('mayOpen', () => {
	test('an unknown page is never open', () => {
		expect(mayOpen({ routeId: 'nope', access: admin })).toBe(false);
	});
});

describe('tilesShownByWidgets', () => {
	test('a leading messages widget takes over the message tiles', () => {
		expect(tilesShownByWidgets(widgetsFor({ state: 'ACTIVE', access: admin }))).toEqual([
			'unreadMessages',
			'reportedChats'
		]);
	});

	test('a compact one does not', () => {
		expect(tilesShownByWidgets(widgetsFor({ state: 'PREPARATION', access: admin }))).toEqual([]);
	});
});
