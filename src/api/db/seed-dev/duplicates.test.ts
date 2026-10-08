import { describe, expect, test } from 'vitest';
import { findDuplicates } from '$api/services/duplicateMatching';
import { devAccounts } from '../seed-data/devAccounts';
import { makeDevAccountUser } from '../seed-data/user';
import { SEEDED_PAIR, earlierAccount } from './duplicates';

/** The matcher reads these columns, all of them nullable in a seed row. */
function profile(row: ReturnType<typeof earlierAccount>) {
	return {
		id: row.id,
		givenName: row.givenName,
		familyName: row.familyName,
		birthday: row.birthday ?? null,
		email: row.email,
		phone: row.phone ?? null,
		emergencyContacts: row.emergencyContacts ?? null,
		street: row.street ?? null,
		zip: row.zip ?? null,
		country: row.country ?? null
	};
}

describe('the seeded returning applicant', () => {
	test('is the one pair the matcher finds among the dev accounts', () => {
		const accounts = devAccounts
			.filter((account) => account.profile !== 'none')
			.map((account) => profile(makeDevAccountUser(account)));
		const pairs = findDuplicates(accounts, [...accounts, profile(earlierAccount())]);
		expect(pairs).toEqual([SEEDED_PAIR]);
	});
});
