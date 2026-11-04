import { describe, expect, it } from 'vitest';
import { chaseLinks, chaseRoleOf } from './chaseLinks';

describe('chaseRoleOf', () => {
	it('makes a seated nation a delegate, a non-state actor an NSA', () => {
		const nation = { kind: 'NATION', chaseAccess: 'SPECTATOR' } as const;
		expect(chaseRoleOf({ role: nation, committeeId: 'ga' })).toBe('DELEGATE');
		expect(chaseRoleOf({ role: nation, committeeId: null })).toBeNull();
		expect(
			chaseRoleOf({
				role: { kind: 'NON_STATE_ACTOR', chaseAccess: 'SPECTATOR' },
				committeeId: null
			})
		).toBe('NSA');
	});

	it('follows a custom role’s CHASE access', () => {
		expect(chaseRoleOf({ role: { kind: 'CUSTOM', chaseAccess: 'TEAM' }, committeeId: null })).toBe(
			'SPECTATOR'
		);
		expect(
			chaseRoleOf({ role: { kind: 'CUSTOM', chaseAccess: 'NONE' }, committeeId: null })
		).toBeNull();
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
