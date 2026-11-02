import { describe, expect, test } from 'vitest';
import { schoolRowSources, schoolRows } from './conferenceAggregates';

const kiel = { id: 's1', name: 'Gymnasium Kiel' };
const luebeck = { id: 's2', name: 'Schule Lübeck' };
const flensburg = { id: 's3', name: 'Realschule Flensburg' };

describe('schoolRows', () => {
	test('counts people by their own school, and the delegations they are in', () => {
		const rows = schoolRows({
			members: [
				{ delegationId: 'd1', school: kiel },
				{ delegationId: 'd1', school: kiel },
				{ delegationId: 'd2', school: kiel },
				// a delegation of two schools counts for both
				{ delegationId: 'd2', school: luebeck },
				{ delegationId: 'd3', school: null }
			],
			singleParticipants: [{ school: luebeck }, { school: flensburg }, { school: null }]
		});

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
		expect(schoolRows({ members: [], singleParticipants: [] })).toEqual([]);
	});

	test('keeps two schools of the same name apart', () => {
		const other = { id: 's4', name: 'Gymnasium Kiel' };
		expect(
			schoolRows({
				members: [{ delegationId: 'd1', school: kiel }],
				singleParticipants: [{ school: other }]
			}).map((row) => row.schoolId)
		).toEqual(['s1', 's4']);
	});
});

describe('schoolRowSources', () => {
	test('names the people, delegations and single participants each school counts', () => {
		const sources = schoolRowSources({
			members: [
				{ delegationId: 'd1', participantId: 'p1', school: kiel },
				{ delegationId: 'd1', participantId: 'p2', school: kiel },
				{ delegationId: 'd2', participantId: 'p3', school: luebeck },
				{ delegationId: 'd3', participantId: 'p4', school: null }
			],
			singleParticipants: [
				{ id: 'sp1', participantId: 'p5', school: kiel },
				{ id: 'sp2', participantId: 'p6', school: null }
			]
		});

		expect(sources.get('s1')).toEqual({
			schoolId: 's1',
			participantIds: ['p1', 'p2', 'p5'],
			delegationIds: ['d1'],
			singleParticipantIds: ['sp1']
		});
		expect(sources.get('s2')).toEqual({
			schoolId: 's2',
			participantIds: ['p3'],
			delegationIds: ['d2'],
			singleParticipantIds: []
		});
		expect(sources.size).toBe(2);
	});
});
