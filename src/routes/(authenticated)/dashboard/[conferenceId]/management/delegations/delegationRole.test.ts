import { describe, expect, test } from 'vitest';
import { assignedRoleName } from './delegationRole';

describe('assignedRoleName', () => {
	test('prefers the nation, then the non-state actor', () => {
		expect(
			assignedRoleName({
				assignedNation: { name: 'Germany' },
				assignedNonStateActor: { name: 'GP' }
			})
		).toBe('Germany');
		expect(assignedRoleName({ assignedNation: null, assignedNonStateActor: { name: 'GP' } })).toBe(
			'GP'
		);
	});

	test('is N/A without an assignment', () => {
		expect(assignedRoleName({ assignedNation: null, assignedNonStateActor: null })).toBe('N/A');
		expect(assignedRoleName({})).toBe('N/A');
	});
});
