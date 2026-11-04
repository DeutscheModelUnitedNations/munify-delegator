import { describe, expect, it } from 'vitest';
import { chaseTransferIssue } from './chaseTransfer';

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
