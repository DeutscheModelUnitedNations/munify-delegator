import { describe, expect, test } from 'vitest';
import { schoolRows } from './conferenceAggregates';

const kiel = { id: 's1', name: 'Gymnasium Kiel' };
const luebeck = { id: 's2', name: 'Schule Lübeck' };
const flensburg = { id: 's3', name: 'Realschule Flensburg' };

describe('schoolRows', () => {
	test('counts people by their own school, and the delegations they are in', () => {
		const rows = schoolRows(
			[
				{ delegationId: 'd1', school: kiel },
				{ delegationId: 'd1', school: kiel },
				{ delegationId: 'd2', school: kiel },
				// a delegation of two schools counts for both
				{ delegationId: 'd2', school: luebeck },
				{ delegationId: 'd3', school: null }
			],
			[{ school: luebeck }, { school: flensburg }, { school: null }]
		);

		expect(rows).toEqual([
			{
				schoolId: 's1',
				school: 'Gymnasium Kiel',
				delegationCount: 2,
				delegationMembers: 3,
				singleParticipants: 0,
				sumParticipants: 3
			},
			{
				schoolId: 's2',
				school: 'Schule Lübeck',
				delegationCount: 1,
				delegationMembers: 1,
				singleParticipants: 1,
				sumParticipants: 2
			},
			{
				schoolId: 's3',
				school: 'Realschule Flensburg',
				delegationCount: 0,
				delegationMembers: 0,
				singleParticipants: 1,
				sumParticipants: 1
			}
		]);
	});

	test('is empty without registrations', () => {
		expect(schoolRows([], [])).toEqual([]);
	});

	test('keeps two schools of the same name apart', () => {
		const other = { id: 's4', name: 'Gymnasium Kiel' };
		expect(
			schoolRows([{ delegationId: 'd1', school: kiel }], [{ school: other }]).map(
				(row) => row.schoolId
			)
		).toEqual(['s1', 's4']);
	});
});
