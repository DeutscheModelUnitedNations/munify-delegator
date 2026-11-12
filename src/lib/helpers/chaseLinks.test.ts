import { describe, expect, it } from 'vitest';
import { chaseIntroOpen, chaseLinks, chasePlaceOf, chaseRoleOf } from './chaseLinks';

describe('chaseRoleOf', () => {
	it('makes a seated nation a delegate, a non-state actor an NSA', () => {
		const nation = { kind: 'NATION' } as const;
		expect(chaseRoleOf({ role: nation, committeeId: 'ga' })).toBe('DELEGATE');
		expect(chaseRoleOf({ role: nation, committeeId: null })).toBeNull();
		expect(
			chaseRoleOf({
				role: { kind: 'NON_STATE_ACTOR' },
				committeeId: null
			})
		).toBe('NSA');
	});

	it('makes a custom role a spectator', () => {
		expect(chaseRoleOf({ role: { kind: 'CUSTOM' }, committeeId: null })).toBe('SPECTATOR');
		expect(chaseRoleOf({ role: null, committeeId: 'ga' })).toBeNull();
	});
});

describe('chaseLinks', () => {
	it("opens a delegate's committee and the participant manual", () => {
		expect(
			chaseLinks({
				chaseUrl: 'https://chase.example/',
				conferenceId: 'conf',
				committeeId: 'ga',
				role: 'DELEGATE'
			})
		).toEqual({
			launcher: 'https://chase.example/app',
			app: 'https://chase.example/app/conf/ga',
			manual: 'https://chase.example/docs/user-manual/participant/getting-started'
		});
	});

	it('opens the conference for everybody else', () => {
		expect(
			chaseLinks({
				chaseUrl: 'https://chase.example',
				conferenceId: 'conf',
				committeeId: null,
				role: 'NSA'
			}).app
		).toBe('https://chase.example/app/conf');
	});
});

describe('chasePlaceOf', () => {
	const base = { chaseUrl: 'https://chase.example/', conferenceId: 'conf' };

	it('sends a seated delegate to their committee', () => {
		expect(
			chasePlaceOf({
				...base,
				member: {
					assignedCommittee: { id: 'ga' },
					delegation: { assignedRole: { kind: 'NATION' } }
				}
			})
		).toEqual({
			role: 'DELEGATE',
			links: {
				launcher: 'https://chase.example/app',
				app: 'https://chase.example/app/conf/ga',
				manual: 'https://chase.example/docs/user-manual/participant/getting-started'
			}
		});
	});

	it("takes a single participant's role", () => {
		expect(chasePlaceOf({ ...base, single: { assignedRole: { kind: 'CUSTOM' } } })?.role).toBe(
			'SPECTATOR'
		);
	});

	it('names no place without a part there', () => {
		expect(chasePlaceOf(base)).toBeUndefined();
		expect(
			chasePlaceOf({
				...base,
				member: { assignedCommittee: null, delegation: { assignedRole: { kind: 'NATION' } } }
			})
		).toBeUndefined();
	});
});

describe('chaseIntroOpen', () => {
	const startConference = new Date('2026-12-20T00:00:00Z');
	it('stays locked until the intro mail goes out, then stays open', () => {
		expect(chaseIntroOpen({ startConference, now: new Date('2026-12-09T23:00:00Z') })).toBe(false);
		expect(chaseIntroOpen({ startConference, now: new Date('2026-12-10T00:00:00Z') })).toBe(true);
		expect(chaseIntroOpen({ startConference, now: new Date('2026-12-21T00:00:00Z') })).toBe(true);
	});
	it('is locked without a start date', () => {
		expect(chaseIntroOpen({ startConference: null })).toBe(false);
	});
});
