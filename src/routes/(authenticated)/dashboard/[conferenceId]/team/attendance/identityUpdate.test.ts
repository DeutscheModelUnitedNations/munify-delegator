import { describe, expect, test } from 'vitest';
import { identityUpdate } from './identityUpdate';

describe('identityUpdate', () => {
	test('only sets the edited field', () => {
		expect(identityUpdate('givenName', 'Ada')).toEqual({
			givenName: 'Ada',
			familyName: undefined,
			birthday: undefined
		});
		expect(identityUpdate('familyName', 'Lovelace')).toEqual({
			givenName: undefined,
			familyName: 'Lovelace',
			birthday: undefined
		});
		expect(identityUpdate('birthday', '2000-01-02')).toEqual({
			givenName: undefined,
			familyName: undefined,
			birthday: new Date('2000-01-02')
		});
	});
});
