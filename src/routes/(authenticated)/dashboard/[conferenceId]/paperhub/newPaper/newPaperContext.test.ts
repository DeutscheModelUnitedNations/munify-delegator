import { beforeEach, describe, expect, test, vi } from 'vitest';

const delegationMembers = vi.fn();
const committeeAgendaItems = vi.fn();

vi.mock('#lib/api/rumbleClient/client.js', () => ({
	client: { liveQuery: { delegationMembers, committeeAgendaItems } }
}));
vi.mock('../paperDisplay', () => ({
	paperEntityName: (delegation: { assignedRole: { name: string | null } | null }) =>
		delegation.assignedRole?.name ?? undefined
}));

const { fetchNewPaperContext } = await import('./newPaperContext');

const member = {
	id: 'member-1',
	assignedCommittee: { id: 'ga', name: 'General Assembly', agendaItems: [] },
	delegation: { id: 'delegation-1', assignedRole: { kind: 'NATION', name: 'Kenya', nation: null } }
};
const agendaItems = [{ id: 'item-1', title: 'Water', committee: { abbreviation: 'GA' } }];

beforeEach(() => {
	delegationMembers.mockResolvedValue([member]);
	committeeAgendaItems.mockResolvedValue(agendaItems);
});

describe('fetchNewPaperContext', () => {
	test('seeds the form with the delegation, its committee and the type asked for', async () => {
		const context = await fetchNewPaperContext('c1', 'u1', 'INTRODUCTION_PAPER');
		expect(context.form.data).toMatchObject({
			delegation: 'Kenya',
			committee: 'General Assembly',
			type: 'INTRODUCTION_PAPER'
		});
		expect(context.delegationMember).toBe(member);
		expect(context.conferenceAgendaItems).toBe(agendaItems);
	});

	test('writes a position paper unless another valid type is asked for', async () => {
		expect((await fetchNewPaperContext('c1', 'u1', null)).form.data.type).toBe('POSITION_PAPER');
		expect((await fetchNewPaperContext('c1', 'u1', 'WORKING_PAPER')).form.data.type).toBe(
			'POSITION_PAPER'
		);
	});

	test('leaves the names empty for a delegation without a role or committee', async () => {
		delegationMembers.mockResolvedValue([
			{ ...member, assignedCommittee: null, delegation: { id: 'd', assignedRole: null } }
		]);
		const { form } = await fetchNewPaperContext('c1', 'u1', null);
		expect(form.data.delegation).toBe('');
		expect(form.data.committee).toBeUndefined();
	});

	test('refuses someone who is not in a delegation', async () => {
		delegationMembers.mockResolvedValue([]);
		await expect(fetchNewPaperContext('c1', 'u1', null)).rejects.toMatchObject({ status: 400 });
	});
});
