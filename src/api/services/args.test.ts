import { describe, expect, test } from 'vitest';
import { assignedRoleConditions, countGiven, nullToUndefined } from './args';

describe('nullToUndefined', () => {
	test('turns null and undefined into undefined', () => {
		expect(nullToUndefined(null)).toBeUndefined();
		expect(nullToUndefined(undefined)).toBeUndefined();
	});

	test('keeps every other value, falsy ones included', () => {
		expect(nullToUndefined(false)).toBe(false);
		expect(nullToUndefined(0)).toBe(0);
		expect(nullToUndefined('')).toBe('');
		const date = new Date();
		expect(nullToUndefined(date)).toBe(date);
	});
});

describe('countGiven', () => {
	test('counts the truthy arguments', () => {
		expect(countGiven()).toBe(0);
		expect(countGiven(null, undefined, '')).toBe(0);
		expect(countGiven('DEU', null)).toBe(1);
		expect(countGiven('DEU', 'nsa')).toBe(2);
	});
});

describe('assignedRoleConditions', () => {
	test('matches each role that is given', () => {
		expect(
			assignedRoleConditions({ assignedNationAlpha3Code: 'DEU', assignedNonStateActorId: 'nsa' })
		).toEqual([{ assignedNationAlpha3Code: 'DEU' }, { assignedNonStateActorId: 'nsa' }]);
		expect(
			assignedRoleConditions({ assignedNationAlpha3Code: 'DEU', assignedNonStateActorId: null })
		).toEqual([{ assignedNationAlpha3Code: 'DEU' }]);
		expect(assignedRoleConditions({ assignedNonStateActorId: 'nsa' })).toEqual([
			{ assignedNonStateActorId: 'nsa' }
		]);
	});

	test('matches nothing without a role', () => {
		expect(assignedRoleConditions({})).toEqual([]);
		expect(
			assignedRoleConditions({ assignedNationAlpha3Code: '', assignedNonStateActorId: null })
		).toEqual([]);
	});
});
