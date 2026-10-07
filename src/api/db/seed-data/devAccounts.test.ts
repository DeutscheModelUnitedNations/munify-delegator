import { resolve } from 'node:path';
import { loadConfigFile } from 'oidc-mock';
import { describe, expect, test } from 'vitest';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { devAccountClaims, devAccounts } from './devAccounts';
import { makeDevAccountUser } from './user';
import { withGeneratedUsers } from './oidcMockUsers';
import oidcMockFile from '../../../../oidc-mock.yaml?raw';

describe('dev accounts', () => {
	test('oidc-mock.yaml lists exactly the dev accounts (run `bun run dev:accounts`)', () => {
		expect(oidcMockFile).toBe(withGeneratedUsers(oidcMockFile));
	});

	test('oidc-mock reads the claims the seed expects', () => {
		// oidc-mock's own loader, so the file is validated exactly as the provider will read it.
		const parsed = loadConfigFile(resolve('oidc-mock.yaml'));
		expect(parsed.users.map((user) => user.sub)).toEqual(devAccounts.map((a) => a.sub));
		for (const account of devAccounts) {
			const user = parsed.users.find((candidate) => candidate.sub === account.sub);
			expect(user?.claims).toEqual(devAccountClaims(account));
		}
	});

	test('subs, emails and labels are unique', () => {
		for (const pick of [
			(a: (typeof devAccounts)[number]) => a.sub,
			(a: (typeof devAccounts)[number]) => devAccountClaims(a).email,
			(a: (typeof devAccounts)[number]) => a.label
		]) {
			const values = devAccounts.map(pick);
			expect(new Set(values).size).toBe(values.length);
		}
	});

	// A seeded profile that fails the form would bounce every login to /my-account.
	test('seeded rows pass the profile form exactly when they are meant to', () => {
		for (const account of devAccounts) {
			if (account.profile === 'none') continue;
			const user = makeDevAccountUser(account);
			const result = userFormSchema.safeParse({
				...user,
				given_name: user.givenName,
				family_name: user.familyName
			});
			expect({ sub: account.sub, valid: result.success }).toEqual({
				sub: account.sub,
				valid: account.profile === 'complete'
			});
		}
	});
});
