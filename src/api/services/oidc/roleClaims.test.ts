import { describe, expect, test } from 'vitest';
import { appRolesOf, claimAt, roleNamesInClaims } from './roleClaims';

describe('claimAt', () => {
	test('prefers the claim of exactly that name, dots and colons included', () => {
		expect(
			claimAt({ claims: { 'https://example.com/roles': ['a'] }, path: 'https://example.com/roles' })
		).toEqual(['a']);
		expect(claimAt({ claims: { 'a.b': 1, a: { b: 2 } }, path: 'a.b' })).toBe(1);
	});

	test('follows a dot path into nested claims', () => {
		expect(
			claimAt({ claims: { realm_access: { roles: ['admin'] } }, path: 'realm_access.roles' })
		).toEqual(['admin']);
		expect(
			claimAt({
				claims: { resource_access: { delegator: { roles: ['x'] } } },
				path: 'resource_access.delegator.roles'
			})
		).toEqual(['x']);
	});

	test('is undefined where nothing is', () => {
		expect(claimAt({ claims: undefined, path: 'roles' })).toBeUndefined();
		expect(
			claimAt({ claims: { realm_access: ['x'] }, path: 'realm_access.roles' })
		).toBeUndefined();
		expect(claimAt({ claims: { roles: 'admin' }, path: 'roles.length' })).toBeUndefined();
	});
});

describe('roleNamesInClaims', () => {
	const names = (claims: unknown, path = 'roles') => roleNamesInClaims({ sources: [claims], path });

	test('Logto, Authentik, Authelia, Okta, Entra: a list of names', () => {
		expect(names({ roles: ['admin', 'member'] })).toEqual(['admin', 'member']);
		expect(names({ groups: ['admins'] }, 'groups')).toEqual(['admins']);
	});

	test('Keycloak: a nested list', () => {
		expect(names({ realm_access: { roles: ['admin'] } }, 'realm_access.roles')).toEqual(['admin']);
	});

	test('Zitadel: an object keyed by role name', () => {
		const claim = 'urn:zitadel:iam:org:project:roles';
		expect(names({ [claim]: { admin: { '123': 'org.example' }, member: {} } }, claim)).toEqual([
			'admin',
			'member'
		]);
	});

	test('Auth0: a namespaced claim', () => {
		expect(
			names({ 'https://munify.cloud/roles': ['admin'] }, 'https://munify.cloud/roles')
		).toEqual(['admin']);
	});

	test('a single name, and lists of { name } objects', () => {
		expect(names({ roles: 'admin' })).toEqual(['admin']);
		expect(names({ roles: [{ name: 'admin' }, { id: 3 }, '', null, 'member'] })).toEqual([
			'admin',
			'member'
		]);
	});

	test('takes the first source holding the claim', () => {
		expect(
			roleNamesInClaims({
				sources: [undefined, { other: 1 }, { roles: ['member'] }],
				path: 'roles'
			})
		).toEqual(['member']);
		expect(
			roleNamesInClaims({ sources: [{ roles: ['admin'] }, { roles: ['member'] }], path: 'roles' })
		).toEqual(['admin']);
		expect(
			roleNamesInClaims({ sources: [{ roles: [] }, { roles: ['member'] }], path: 'roles' })
		).toEqual([]);
		expect(
			roleNamesInClaims({ sources: [{ roles: null }, { roles: ['member'] }], path: 'roles' })
		).toEqual(['member']);
	});

	test('grants nothing for an unknown shape or no claim', () => {
		expect(roleNamesInClaims({ sources: [], path: 'roles' })).toEqual([]);
		expect(names({ roles: 3 })).toEqual([]);
		expect(names({ roles: '' })).toEqual([]);
		expect(names('token')).toEqual([]);
	});
});

describe('appRolesOf', () => {
	test('without a map, a role is granted by its own name', () => {
		expect(appRolesOf({ names: ['member', 'admin', 'unknown'] })).toEqual(['admin', 'member']);
	});

	test('a mapped role is granted by the names listed for it only', () => {
		const map = { admin: ['delegator-admins', '6f1c…-guid'] };
		expect(appRolesOf({ names: ['delegator-admins'], roleMap: map })).toEqual(['admin']);
		expect(appRolesOf({ names: ['6f1c…-guid', 'member'], roleMap: map })).toEqual([
			'admin',
			'member'
		]);
		expect(appRolesOf({ names: ['admin'], roleMap: map })).toEqual([]);
	});
});
