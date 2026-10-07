import { describe, expect, it } from 'vitest';
import { experienceShare } from './experience';
import { assignmentGroups } from './state';

const delegation = (id: string, size: number) => ({
	id,
	nationAlpha3Code: null,
	nonStateActorId: null,
	members: Array.from({ length: size }, (_, i) => ({ id: `${id}-${i}`, isHeadDelegate: i === 0 }))
});

describe('experienceShare', () => {
	it('is the share of the delegation’s members who were seated before', () => {
		const { groups } = assignmentGroups([delegation('a', 4)], [], []);
		expect(experienceShare(groups[0], new Set())).toBe(0);
		expect(experienceShare(groups[0], new Set(['a-0']))).toBe(0.25);
		expect(experienceShare(groups[0], new Set(['a-0', 'a-1', 'a-2', 'a-3']))).toBe(1);
	});

	it('ignores people of other groups', () => {
		const { groups } = assignmentGroups([delegation('a', 2)], [], []);
		expect(experienceShare(groups[0], new Set(['b-0']))).toBe(0);
	});

	it('looks only at the members of a part of a split delegation', () => {
		const { groups } = assignmentGroups(
			[delegation('a', 3)],
			[],
			[
				{
					id: 'u1',
					sourceDelegationId: 'a',
					sourceSingleParticipantId: null,
					nationAlpha3Code: null,
					nonStateActorId: null,
					memberIds: ['a-0', 'a-1']
				},
				{
					id: 'u2',
					sourceDelegationId: 'a',
					sourceSingleParticipantId: null,
					nationAlpha3Code: null,
					nonStateActorId: null,
					memberIds: ['a-2']
				}
			]
		);
		const experienced = new Set(['a-2']);
		expect(
			experienceShare(
				groups.find((g) => g.key === 'u1')!,
				experienced
			)
		).toBe(0);
		expect(
			experienceShare(
				groups.find((g) => g.key === 'u2')!,
				experienced
			)
		).toBe(1);
	});

	it('is all or nothing for a single participant', () => {
		const { groups } = assignmentGroups(
			[],
			[{ id: 's', roleId: null }],
			[
				{
					id: 'u',
					sourceDelegationId: null,
					sourceSingleParticipantId: 's',
					nationAlpha3Code: null,
					nonStateActorId: null,
					memberIds: []
				}
			]
		);
		expect(experienceShare(groups[0], new Set(['s']))).toBe(1);
		expect(experienceShare(groups[0], new Set())).toBe(0);
	});
});
