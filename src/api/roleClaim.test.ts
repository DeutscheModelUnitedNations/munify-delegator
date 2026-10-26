import { describe, expect, test } from 'vitest';
import { roleNamesInClaim } from './roleClaim';

describe('roleNamesInClaim', () => {
	test('reads a list of names', () => {
		expect(roleNamesInClaim([{ roles: ['admin', 'member'] }], 'roles')).toEqual([
			'admin',
			'member'
		]);
	});

	test('reads a list of objects by their name, skipping entries without one', () => {
		expect(
			roleNamesInClaim([{ roles: [{ name: 'admin' }, { id: 3 }, '', null, 'member'] }], 'roles')
		).toEqual(['admin', 'member']);
	});

	test('reads an object keyed by role name', () => {
		expect(
			roleNamesInClaim([{ 'urn:roles': { admin: { org: 1 }, service_user: {} } }], 'urn:roles')
		).toEqual(['admin', 'service_user']);
	});

	test('takes the first token that carries the claim', () => {
		expect(roleNamesInClaim([undefined, { other: 1 }, { roles: ['member'] }], 'roles')).toEqual([
			'member'
		]);
		expect(roleNamesInClaim([{ roles: ['admin'] }, { roles: ['member'] }], 'roles')).toEqual([
			'admin'
		]);
		// an empty claim is still the claim, as with `??`
		expect(roleNamesInClaim([{ roles: [] }, { roles: ['member'] }], 'roles')).toEqual([]);
	});

	test('finds nothing without the claim, or with a claim of another shape', () => {
		expect(roleNamesInClaim([], 'roles')).toEqual([]);
		expect(roleNamesInClaim([null, 'token'], 'roles')).toEqual([]);
		expect(roleNamesInClaim([{ roles: 'admin' }], 'roles')).toEqual([]);
	});
});
