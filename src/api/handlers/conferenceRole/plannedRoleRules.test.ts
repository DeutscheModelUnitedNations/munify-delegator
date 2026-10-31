import { describe, expect, test } from 'vitest';
import {
	assertCustomRoleDeletable,
	assertCustomRoleSeatsAllowed,
	assertNonStateActorDeletable,
	assertNonStateActorSeatsAllowed,
	customRoleSeatsSchema,
	nonStateActorUpdateData
} from './plannedRoleRules';

describe('nonStateActorUpdateData', () => {
	test('leaves omitted and null fields untouched', () => {
		expect(nonStateActorUpdateData({ name: 'Greenpeace', abbreviation: null })).toEqual({
			name: 'Greenpeace',
			abbreviation: undefined,
			description: undefined,
			seatAmount: undefined,
			fontAwesomeIcon: undefined
		});
	});

	test('an empty icon clears it', () => {
		expect(nonStateActorUpdateData({ fontAwesomeIcon: '' }).fontAwesomeIcon).toBeNull();
		expect(nonStateActorUpdateData({ fontAwesomeIcon: 'fa-tree' }).fontAwesomeIcon).toBe('fa-tree');
	});

	test('passes the seat amount on', () => {
		expect(nonStateActorUpdateData({ seatAmount: 3 }).seatAmount).toBe(3);
	});
});

describe('assertNonStateActorDeletable', () => {
	test('blocks while a delegation is assigned', () => {
		expect(() => assertNonStateActorDeletable(1)).toThrow();
		expect(() => assertNonStateActorDeletable(0)).not.toThrow();
	});
});

describe('customRoleSeatsSchema', () => {
	test('needs at least one seat', () => {
		expect(customRoleSeatsSchema.safeParse(0).success).toBe(false);
		expect(customRoleSeatsSchema.safeParse(1).success).toBe(true);
	});
});

describe('assertCustomRoleSeatsAllowed', () => {
	test('refuses fewer seats than holders and passes a left out amount', () => {
		expect(() => assertCustomRoleSeatsAllowed({ seatAmount: 1, holders: 2 })).toThrow();
		expect(() => assertCustomRoleSeatsAllowed({ seatAmount: 2, holders: 2 })).not.toThrow();
		expect(() => assertCustomRoleSeatsAllowed({ seatAmount: undefined, holders: 5 })).not.toThrow();
	});
});

describe('assertCustomRoleDeletable', () => {
	test('blocks while somebody holds the role', () => {
		expect(() => assertCustomRoleDeletable(1)).toThrow();
		expect(() => assertCustomRoleDeletable(0)).not.toThrow();
	});
});

describe('assertNonStateActorSeatsAllowed', () => {
	test('refuses fewer seats than the assigned delegation has members', () => {
		expect(() => assertNonStateActorSeatsAllowed({ seatAmount: 2, assignedMembers: 3 })).toThrow();
		expect(() =>
			assertNonStateActorSeatsAllowed({ seatAmount: 3, assignedMembers: 3 })
		).not.toThrow();
		expect(() =>
			assertNonStateActorSeatsAllowed({ seatAmount: undefined, assignedMembers: 3 })
		).not.toThrow();
	});
});
