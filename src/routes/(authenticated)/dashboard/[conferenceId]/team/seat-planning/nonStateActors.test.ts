import { describe, expect, test } from 'vitest';
import { nonStateActorRow } from './nonStateActors';

describe('nonStateActorRow', () => {
	test('keeps the columns of a complete role', () => {
		const role = {
			id: 'nsa-1',
			name: 'Greenpeace',
			abbreviation: 'GP',
			description: 'An environmental organisation',
			icon: 'tree',
			seatAmount: 2
		};
		expect(nonStateActorRow(role)).toEqual(role);
	});

	test('reads unset columns as empty', () => {
		expect(
			nonStateActorRow({
				id: 'nsa-2',
				name: null,
				abbreviation: undefined,
				description: null,
				icon: undefined,
				seatAmount: null
			})
		).toEqual({
			id: 'nsa-2',
			name: '',
			abbreviation: '',
			description: '',
			icon: null,
			seatAmount: 0
		});
	});
});
