import { describe, expect, test } from 'vitest';
import { customRoleRow, optionalText } from './customRoles';

describe('customRoleRow', () => {
	test('counts the holders and keeps what is set', () => {
		expect(
			customRoleRow({
				id: 'r1',
				name: 'Presse',
				description: 'Berichtet',
				fontAwesomeIcon: 'newspaper',
				seatAmount: 4,
				assignedSingleParticipants: [{}, {}]
			})
		).toEqual({
			id: 'r1',
			name: 'Presse',
			description: 'Berichtet',
			fontAwesomeIcon: 'newspaper',
			seatAmount: 4,
			holders: 2
		});
	});

	test('fills in what is unset', () => {
		expect(customRoleRow({ id: 'r2', assignedSingleParticipants: [] })).toEqual({
			id: 'r2',
			name: '',
			description: '',
			fontAwesomeIcon: null,
			seatAmount: 0,
			holders: 0
		});
	});
});

test('optionalText trims, and leaves out what is blank', () => {
	expect(optionalText('  Presse ')).toBe('Presse');
	expect(optionalText('   ')).toBeUndefined();
});
