import { describe, expect, test, vi } from 'vitest';
import type { Context } from '#api/context';

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/rumble', () => ({ abilityBuilder: {} }));
vi.mock('#api/services/oidc/OIDC', () => ({ OIDC: {} }));
const { assertCanUpdateNewsletterPreferences } = await import('./userPermissions');

function signedInAs(email: string | undefined): Context {
	const ctx = { oidc: { user: email === undefined ? undefined : { sub: 'u', email } } };
	// TYPE-SAFETY-EXCEPTION: the check reads only the caller's email, and building a real
	// RequestEvent here would test SvelteKit, not it.
	return ctx as Context;
}

const optIn = (email: string) => ({ email, wantsToReceiveGeneralInformation: true });

describe('assertCanUpdateNewsletterPreferences', () => {
	test('the account itself opts in, whatever the case of either address', () => {
		expect(() =>
			assertCanUpdateNewsletterPreferences({
				ctx: signedInAs('Ada@Example.org'),
				args: optIn('ADA@example.ORG')
			})
		).not.toThrow();
	});

	test('nobody opts in another address, or without a session', () => {
		expect(() =>
			assertCanUpdateNewsletterPreferences({
				ctx: signedInAs('ada@example.org'),
				args: optIn('bob@example.org')
			})
		).toThrow();
		expect(() =>
			assertCanUpdateNewsletterPreferences({ ctx: signedInAs(undefined), args: optIn('a@b.de') })
		).toThrow();
	});

	test('anybody opts out', () => {
		expect(() =>
			assertCanUpdateNewsletterPreferences({
				ctx: signedInAs(undefined),
				args: { email: 'bob@example.org', wantsToReceiveGeneralInformation: false }
			})
		).not.toThrow();
	});
});
