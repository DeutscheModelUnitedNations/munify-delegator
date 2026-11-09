import { describe, expect, it } from 'vitest';
import { chaseLinks, chaseRoleOf } from './chaseLinks';

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
