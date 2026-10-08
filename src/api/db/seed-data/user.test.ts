import { describe, expect, test } from 'vitest';
import { faker } from '@faker-js/faker';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { makeSeedUser } from './user';

describe('makeSeedUser', () => {
	test('a complete seed user passes the account form, whatever country it lives in', () => {
		faker.seed(7);
		for (let i = 0; i < 200; i++) {
			const user = makeSeedUser();
			const result = userFormSchema.safeParse({
				...user,
				given_name: user.givenName,
				family_name: user.familyName
			});
			expect(result.error?.issues, `${user.country} ${user.zip}`).toBeUndefined();
		}
	});
});
