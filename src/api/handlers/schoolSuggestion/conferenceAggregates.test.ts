import { describe, expect, test } from 'vitest';
import { distinctNationCodes, normalizeSchoolName, schoolRows } from './conferenceAggregates';

describe('schoolRows', () => {
	test('counts delegations, their members and single participants per school', () => {
		const rows = schoolRows(
			[
				{ id: 'd1', school: 'Gymnasium Kiel' },
				{ id: 'd2', school: 'Gymnasium Kiel' },
				{ id: 'd3', school: 'Schule Lübeck' },
				{ id: 'd4', school: null }
			],
			[
				{ delegationId: 'd1' },
				{ delegationId: 'd1' },
				{ delegationId: 'd2' },
				{ delegationId: 'd4' }
			],
			[{ school: 'Schule Lübeck' }, { school: 'Realschule Flensburg' }, { school: null }]
		);

		expect(rows).toEqual([
			{
				school: 'Gymnasium Kiel',
				delegationCount: 2,
				delegationMembers: 3,
				singleParticipants: 0,
				sumParticipants: 3
			},
			{
				school: 'Schule Lübeck',
				delegationCount: 1,
				delegationMembers: 0,
				singleParticipants: 1,
				sumParticipants: 1
			},
			{
				school: 'Realschule Flensburg',
				delegationCount: 0,
				delegationMembers: 0,
				singleParticipants: 1,
				sumParticipants: 1
			}
		]);
	});

	test('is empty without registrations', () => {
		expect(schoolRows([], [], [])).toEqual([]);
	});

	test('leaves out an empty school name', () => {
		expect(schoolRows([{ id: 'd1', school: '' }], [], [{ school: '' }])).toEqual([]);
	});
});

describe('distinctNationCodes', () => {
	const deu = { alpha2Code: 'de', alpha3Code: 'DEU' };
	const fra = { alpha2Code: 'fr', alpha3Code: 'FRA' };

	test('lists each nation once, in the order the committees seat them', () => {
		expect(
			distinctNationCodes([{ nations: [deu, fra] }, { nations: [fra] }, { nations: [] }])
		).toEqual(['DEU', 'FRA']);
	});

	test('deduplicates by alpha-2 code', () => {
		expect(
			distinctNationCodes([
				{ nations: [deu] },
				{ nations: [{ alpha2Code: 'de', alpha3Code: 'XXX' }] }
			])
		).toEqual(['DEU']);
	});

	test('is empty without committees', () => {
		expect(distinctNationCodes([])).toEqual([]);
	});
});

describe('normalizeSchoolName', () => {
	test('replaces every comma and period and tidies whitespace', () => {
		expect(normalizeSchoolName('  Gym., Musterstadt. Nord ')).toBe('Gym Musterstadt Nord');
	});

	test('is empty for punctuation only', () => {
		expect(normalizeSchoolName(' ., ')).toBe('');
	});
});
