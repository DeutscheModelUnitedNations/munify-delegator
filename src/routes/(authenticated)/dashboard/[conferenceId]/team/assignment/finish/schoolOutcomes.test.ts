import { describe, expect, test } from 'vitest';
import { mixedSchoolOutcomes } from './schoolOutcomes';

const kiel = { id: 'kiel', name: 'Gymnasium Kiel', isForeignSchool: false };

const nation = { roleId: 'deu' };
const none = { roleId: null };
const group = ({
	memberIds,
	target,
	singleParticipantId = null
}: {
	memberIds: string[];
	target: { roleId: string | null };
	singleParticipantId?: string | null;
}) => ({ memberIds, target, singleParticipantId });

const school = {
	school: kiel,
	members: [
		{ delegationMemberId: 'm1', delegationId: 'd1' },
		{ delegationMemberId: 'm2', delegationId: 'd1' },
		{ delegationMemberId: 'm3', delegationId: 'd2' }
	],
	singleParticipantIds: ['s1'],
	size: 4
};

describe('mixedSchoolOutcomes', () => {
	test('lists a school whose applicants would be seated only partly', () => {
		const result = mixedSchoolOutcomes({
			schools: [school],
			plan: {
				groups: [group({ memberIds: ['m1', 'm2'], target: nation })],
				singles: [{ singleParticipantId: 's1', roleId: null }]
			}
		});
		expect(result).toEqual([
			{
				school: kiel,
				seated: 2,
				size: 4,
				acceptedApplicationIds: ['d1'],
				declinedApplicationIds: ['d2', 's1']
			}
		]);
	});

	test('leaves out a school seated or left out as a whole', () => {
		const allSeated = {
			groups: [
				group({ memberIds: ['m1', 'm2'], target: nation }),
				group({ memberIds: ['m3'], target: { roleId: 'fra' } })
			],
			singles: [{ singleParticipantId: 's1', roleId: 'press' }]
		};
		expect(mixedSchoolOutcomes({ schools: [school], plan: allSeated })).toEqual([]);
		expect(mixedSchoolOutcomes({ schools: [school], plan: { groups: [], singles: [] } })).toEqual(
			[]
		);
	});

	test('lists a split delegation on both sides', () => {
		const result = mixedSchoolOutcomes({
			schools: [
				{ ...school, members: school.members.slice(0, 2), singleParticipantIds: [], size: 2 }
			],
			plan: {
				groups: [
					group({ memberIds: ['m1'], target: nation }),
					group({ memberIds: ['m2'], target: none })
				],
				singles: []
			}
		});
		expect(result[0]).toMatchObject({
			seated: 1,
			acceptedApplicationIds: ['d1'],
			declinedApplicationIds: ['d1']
		});
	});

	test('counts a single participant turned into a delegation by its group', () => {
		const result = mixedSchoolOutcomes({
			schools: [school],
			plan: {
				groups: [group({ memberIds: [], target: nation, singleParticipantId: 's1' })],
				singles: []
			}
		});
		expect(result[0]).toMatchObject({
			seated: 1,
			acceptedApplicationIds: ['s1'],
			declinedApplicationIds: ['d1', 'd2']
		});
	});
});
