import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db.js', () => ({ db: {} }));

const { delegationPart } = await import('./emailSnapshot');

const germany = { id: 'r1', kind: 'NATION' as const, name: null, nationAlpha3Code: 'DEU' };

describe('delegationPart', () => {
	test('is nothing outside a delegation', () => {
		expect(delegationPart(undefined)).toBeNull();
		expect(delegationPart(null)).toBeNull();
		expect(delegationPart({ delegation: null })).toBeNull();
	});

	test('reads the application, the role and the committee of a member', () => {
		expect(
			delegationPart({
				delegation: { applied: true, assignedRole: germany },
				assignedCommittee: { abbreviation: 'GA' }
			})
		).toEqual({ applied: true, role: germany, committee: 'GA' });
	});

	test('a member without a role or committee has none', () => {
		expect(delegationPart({ delegation: { applied: false } })).toEqual({
			applied: false,
			role: null,
			committee: null
		});
		expect(
			delegationPart({ delegation: { applied: true, assignedRole: null }, assignedCommittee: null })
		).toEqual({ applied: true, role: null, committee: null });
	});
});
