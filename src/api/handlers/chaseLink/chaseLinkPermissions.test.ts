import { describe, expect, test, vi } from 'vitest';
import { GraphQLError } from 'graphql';

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/rumble', () => ({ abilityBuilder: {} }));
const { assertCanRequestLinkSync, assertCanRequestRemoteLinkSync } =
	await import('./chaseLinkPermissions');

type Ctx = Parameters<typeof assertCanRequestLinkSync>[0];

/** A caller holding `roles`; signed in unless anonymous. */
function caller(roles: string[], { signedIn = true } = {}) {
	return {
		hasRole: (role: string) => roles.includes(role),
		mustBeLoggedIn: () => {
			if (!signedIn) throw new GraphQLError('no', { extensions: { code: 'UNAUTHENTICATED' } });
			return { sub: 'someone' };
		}
	} as unknown as Ctx;
}

const refusal = (check: () => void) => {
	try {
		check();
		return undefined;
	} catch (error) {
		return (error as GraphQLError).extensions.code;
	}
};

describe('assertCanRequestLinkSync', () => {
	test('lets system admins and the linked CHASE ask for a sync', () => {
		expect(refusal(() => assertCanRequestLinkSync(caller(['admin'])))).toBeUndefined();
		expect(
			refusal(() => assertCanRequestLinkSync(caller(['chase'], { signedIn: false })))
		).toBeUndefined();
	});

	test('refuses everybody else', () => {
		expect(refusal(() => assertCanRequestLinkSync(caller(['member'])))).toBe('FORBIDDEN');
		expect(refusal(() => assertCanRequestLinkSync(caller([], { signedIn: false })))).toBe(
			'UNAUTHENTICATED'
		);
	});
});

describe('assertCanRequestRemoteLinkSync', () => {
	test('lets only system admins ask CHASE, never CHASE itself', () => {
		expect(refusal(() => assertCanRequestRemoteLinkSync(caller(['admin'])))).toBeUndefined();
		expect(
			refusal(() => assertCanRequestRemoteLinkSync(caller(['chase'], { signedIn: false })))
		).toBe('UNAUTHENTICATED');
		expect(refusal(() => assertCanRequestRemoteLinkSync(caller(['chase', 'member'])))).toBe(
			'FORBIDDEN'
		);
	});
});
