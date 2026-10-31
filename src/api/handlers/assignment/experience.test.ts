import { describe, expect, it } from 'vitest';
import { experienceShare } from './experience';
import { assignmentGroups } from '#lib/assignment/state';

const delegation = (id: string, size: number) => ({
	id,
	roleId: null,
	members: Array.from({ length: size }, (_, i) => ({ id: `${id}-${i}`, isHeadDelegate: i === 0 }))
});

describe('experienceShare', () => {
	it('is the share of the delegation’s members who were seated before', () => {
		const { groups } = assignmentGroups({
			delegations: [delegation('a', 4)],
			singleParticipants: [],
			units: []
		});
		expect(experienceShare({ group: groups[0], experiencedIds: new Set() })).toBe(0);
		expect(experienceShare({ group: groups[0], experiencedIds: new Set(['a-0']) })).toBe(0.25);
		expect(
			experienceShare({ group: groups[0], experiencedIds: new Set(['a-0', 'a-1', 'a-2', 'a-3']) })
		).toBe(1);
	});

	it('ignores people of other groups', () => {
		const { groups } = assignmentGroups({
			delegations: [delegation('a', 2)],
			singleParticipants: [],
			units: []
		});
		expect(experienceShare({ group: groups[0], experiencedIds: new Set(['b-0']) })).toBe(0);
	});

	it('looks only at the members of a part of a split delegation', () => {
		const { groups } = assignmentGroups({
			delegations: [delegation('a', 3)],
			singleParticipants: [],
			units: [
				{
					id: 'u1',
					sourceDelegationId: 'a',
					sourceSingleParticipantId: null,
					roleId: null,
					memberIds: ['a-0', 'a-1']
				},
				{
					id: 'u2',
					sourceDelegationId: 'a',
					sourceSingleParticipantId: null,
					roleId: null,
					memberIds: ['a-2']
				}
			]
		});
		const experienced = new Set(['a-2']);
		expect(
			experienceShare({ group: groups.find((g) => g.key === 'u1')!, experiencedIds: experienced })
		).toBe(0);
		expect(
			experienceShare({ group: groups.find((g) => g.key === 'u2')!, experiencedIds: experienced })
		).toBe(1);
	});

	it('is all or nothing for a single participant', () => {
		const { groups } = assignmentGroups({
			delegations: [],
			singleParticipants: [{ id: 's', roleId: null }],
			units: [
				{
					id: 'u',
					sourceDelegationId: null,
					sourceSingleParticipantId: 's',
					roleId: null,
					memberIds: []
				}
			]
		});
		expect(experienceShare({ group: groups[0], experiencedIds: new Set(['s']) })).toBe(1);
		expect(experienceShare({ group: groups[0], experiencedIds: new Set() })).toBe(0);
	});
});
