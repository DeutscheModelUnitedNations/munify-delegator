import { describe, expect, it } from 'vitest';
import { chaseTransferIssue, keptBackPapers } from './chaseTransfer';

const agendaItem = { committee: { roles: [{ id: 'deu' }] } };

describe('chaseTransferIssue', () => {
	it('lets a paper of a seated delegation with an agenda item across', () => {
		expect(chaseTransferIssue({ agendaItem, assignedRoleId: 'deu' })).toBeNull();
	});

	it('keeps back a paper without an agenda item', () => {
		expect(chaseTransferIssue({ agendaItem: null, assignedRoleId: 'deu' })).toBe('noAgendaItem');
	});

	it("keeps back a paper whose delegation has no seat in the agenda item's committee", () => {
		expect(chaseTransferIssue({ agendaItem, assignedRoleId: 'fra' })).toBe('noSeat');
		expect(chaseTransferIssue({ agendaItem, assignedRoleId: null })).toBe('noSeat');
	});
});

describe('keptBackPapers', () => {
	const item = { title: 'Climate', committee: { abbreviation: 'GA', roles: [{ id: 'deu' }] } };

	it('lists the papers kept back, labelled by role and agenda item', () => {
		expect(
			keptBackPapers([
				{
					id: 'across',
					agendaItem: item,
					delegation: { assignedRoleId: 'deu', assignedRole: null }
				},
				{
					id: 'unseated',
					agendaItem: item,
					delegation: {
						assignedRoleId: 'fra',
						assignedRole: { name: null, nationAlpha3Code: 'FRA' }
					}
				},
				{
					id: 'loose',
					agendaItem: null,
					delegation: { assignedRoleId: null, assignedRole: { name: 'Greenpeace' } }
				}
			])
		).toEqual([
			{ id: 'unseated', label: 'FRA · GA: Climate', issue: 'noSeat' },
			{ id: 'loose', label: 'Greenpeace', issue: 'noAgendaItem' }
		]);
	});
});
