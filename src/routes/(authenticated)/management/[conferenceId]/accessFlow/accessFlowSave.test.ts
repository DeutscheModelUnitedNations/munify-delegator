import { describe, expect, test } from 'vitest';
import { identityUpdate, planAccessFlowSave, savesAnything } from './accessFlowSave';

describe('planAccessFlowSave', () => {
	test('needs a scanned user', () => {
		expect(planAccessFlowSave(undefined, 'card', 'Day 1')).toBeUndefined();
		expect(planAccessFlowSave({ user: null, status: null }, 'card', 'Day 1')).toBeUndefined();
	});

	test('trims the inputs and drops blank ones', () => {
		expect(
			planAccessFlowSave({ user: { id: 'u' }, status: { id: 's' } }, '  card-1 ', ' Day 1 ')
		).toEqual({ userId: 'u', statusId: 's', accessCardId: 'card-1', occasion: 'Day 1' });
		expect(planAccessFlowSave({ user: { id: 'u' }, status: null }, '   ', '')).toEqual({
			userId: 'u',
			statusId: undefined,
			accessCardId: undefined,
			occasion: undefined
		});
	});
});

describe('savesAnything', () => {
	const base = { userId: 'u', statusId: undefined, accessCardId: undefined, occasion: undefined };

	test('is true when either an access card or an occasion is written', () => {
		expect(savesAnything(base)).toBe(false);
		expect(savesAnything({ ...base, accessCardId: 'c' })).toBe(true);
		expect(savesAnything({ ...base, occasion: 'o' })).toBe(true);
	});
});

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
