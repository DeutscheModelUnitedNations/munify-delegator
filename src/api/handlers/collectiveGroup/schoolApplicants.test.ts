import { describe, expect, test } from 'vitest';
import { schoolApplicants } from './schoolApplicants';

const kiel = { id: 'kiel', name: 'Gymnasium Kiel', isForeignSchool: false };
const luebeck = { id: 'luebeck', name: 'Schule Lübeck', isForeignSchool: false };

describe('schoolApplicants', () => {
	test('groups members and single participants by their school', () => {
		const result = schoolApplicants([
			{ school: luebeck, delegationMemberId: 'm1', delegationId: 'd1' },
			{ school: kiel, delegationMemberId: 'm2', delegationId: 'd2' },
			{ school: luebeck, singleParticipantId: 's1' },
			{ school: kiel, delegationMemberId: 'm3', delegationId: 'd2' }
		]);
		expect(result).toEqual([
			{
				school: kiel,
				members: [
					{ delegationMemberId: 'm2', delegationId: 'd2' },
					{ delegationMemberId: 'm3', delegationId: 'd2' }
				],
				singleParticipantIds: [],
				size: 2
			},
			{
				school: luebeck,
				members: [{ delegationMemberId: 'm1', delegationId: 'd1' }],
				singleParticipantIds: ['s1'],
				size: 2
			}
		]);
	});

	test('leaves out schools with a single applicant', () => {
		expect(schoolApplicants([{ school: kiel, singleParticipantId: 's1' }])).toEqual([]);
	});
});
