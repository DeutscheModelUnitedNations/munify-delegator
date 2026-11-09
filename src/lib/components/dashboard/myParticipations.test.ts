import { beforeEach, describe, expect, it, vi } from 'vitest';

const liveQuery = vi.hoisted(() => ({
	delegationMembers: vi.fn(),
	singleParticipants: vi.fn(),
	conferenceSupervisors: vi.fn(),
	teamMembers: vi.fn()
}));
vi.mock('#lib/api/rumbleClient/client', () => ({ client: { liveQuery } }));

const { fetchMyParticipations } = await import('./myParticipations');

const delegationMember = {
	conference: { id: 'c1' },
	isHeadDelegate: true,
	assignedCommittee: null,
	delegation: { applied: true, assignedRole: null }
};
const supervisor = { conference: { id: 'c2' } };
const teamMember = { conferenceId: 'c3', role: 'MEMBER' };

beforeEach(() => {
	liveQuery.delegationMembers.mockResolvedValue([delegationMember]);
	liveQuery.singleParticipants.mockResolvedValue([]);
	liveQuery.conferenceSupervisors.mockResolvedValue([supervisor]);
	liveQuery.teamMembers.mockResolvedValue([teamMember]);
});

describe('fetchMyParticipations', () => {
	it('filters registrations by the participant row, not the user relation', async () => {
		await fetchMyParticipations('u1');
		const where = { participant: { userId: { eq: 'u1' } } };
		expect(liveQuery.delegationMembers.mock.calls[0][0].__args.where).toEqual(where);
		expect(liveQuery.singleParticipants.mock.calls[0][0].__args.where).toEqual(where);
		expect(liveQuery.conferenceSupervisors.mock.calls[0][0].__args.where).toEqual(where);
		expect(liveQuery.teamMembers.mock.calls[0][0].__args.where).toEqual({
			userId: { eq: 'u1' }
		});
	});

	it('lists every conference with a part in it', async () => {
		const participations = await fetchMyParticipations('u1');
		expect(participations.conferenceIds).toEqual(new Set(['c1', 'c2', 'c3']));
	});

	it('picks the part in one conference', async () => {
		const participations = await fetchMyParticipations('u1');
		expect(participations.in('c1')).toEqual({
			teamMember: null,
			delegationMember,
			singleParticipant: null,
			supervisor: null
		});
		expect(participations.in('c2').supervisor).toBe(supervisor);
		expect(participations.in('c3').teamMember).toBe(teamMember);
		expect(participations.in('elsewhere')).toEqual({
			teamMember: null,
			delegationMember: null,
			singleParticipant: null,
			supervisor: null
		});
	});
});
