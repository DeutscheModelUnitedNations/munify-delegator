import { describe, expect, test } from 'vitest';
import { uniqueSupervisorsByFamilyName } from './supervisorList';

const sup = (id: string, familyName: string | null) => ({ id, user: { familyName } });

describe('uniqueSupervisorsByFamilyName', () => {
	test('merges, dedupes by id and sorts by family name', () => {
		const result = uniqueSupervisorsByFamilyName(
			[sup('1', 'Zeta'), sup('2', 'Alpha')],
			[sup('2', 'Alpha'), sup('3', null)]
		);
		expect(result.map((s) => s.id)).toEqual(['3', '2', '1']);
	});
	test('missing lists count as empty', () => {
		expect(uniqueSupervisorsByFamilyName(undefined, undefined)).toEqual([]);
	});
});
