import { describe, expect, test } from 'vitest';
import { normalizeSchoolName, schoolRows } from './conferenceAggregates';

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

describe('normalizeSchoolName', () => {
	test('replaces every comma and period and tidies whitespace', () => {
		expect(normalizeSchoolName('  Gym., Musterstadt. Nord ')).toBe('Gym Musterstadt Nord');
	});

	test('is empty for punctuation only', () => {
		expect(normalizeSchoolName(' ., ')).toBe('');
	});
});
