import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/rumble', () => ({ abilityBuilder: {} }));
const { paperRefusal } = await import('./paperPermissions');

const nation = { assignmentReleased: true, roleKind: 'NATION' as const, assignedCommitteeId: 'GA' };
const nsa = {
	assignmentReleased: true,
	roleKind: 'NON_STATE_ACTOR' as const,
	assignedCommitteeId: null
};

const refusalOf = (...args: Parameters<typeof paperRefusal>) =>
	paperRefusal(...args)?.extensions.code;

describe('paperRefusal', () => {
	test('a nation writes on the agenda items of its own committee only', () => {
		expect(refusalOf(nation, { type: 'POSITION_PAPER', agendaItemCommitteeId: 'GA' })).toBe(
			undefined
		);
		expect(refusalOf(nation, { type: 'POSITION_PAPER', agendaItemCommitteeId: 'SC' })).toBe(
			'FORBIDDEN'
		);
		expect(refusalOf(nation, { type: 'WORKING_PAPER', agendaItemCommitteeId: 'SC' })).toBe(
			'FORBIDDEN'
		);
	});

	test('a nation member without a committee writes on none', () => {
		expect(
			refusalOf(
				{ ...nation, assignedCommitteeId: null },
				{ type: 'POSITION_PAPER', agendaItemCommitteeId: 'GA' }
			)
		).toBe('FORBIDDEN');
	});

	test('a non-state actor writes on any agenda item', () => {
		expect(refusalOf(nsa, { type: 'POSITION_PAPER', agendaItemCommitteeId: 'SC' })).toBe(undefined);
	});

	test('only non-state actors write introduction papers, and without an agenda item', () => {
		expect(refusalOf(nsa, { type: 'INTRODUCTION_PAPER', agendaItemCommitteeId: null })).toBe(
			undefined
		);
		expect(refusalOf(nsa, { type: 'INTRODUCTION_PAPER', agendaItemCommitteeId: 'GA' })).toBe(
			'INVALID_INPUT'
		);
		expect(refusalOf(nation, { type: 'INTRODUCTION_PAPER', agendaItemCommitteeId: null })).toBe(
			'FORBIDDEN'
		);
	});

	test('any other paper needs an agenda item', () => {
		expect(refusalOf(nsa, { type: 'POSITION_PAPER', agendaItemCommitteeId: null })).toBe(
			'INVALID_INPUT'
		);
	});

	test('nothing is written before the release or without a delegation role', () => {
		const paper = { type: 'POSITION_PAPER' as const, agendaItemCommitteeId: 'GA' };
		expect(refusalOf({ ...nation, assignmentReleased: false }, paper)).toBe('FORBIDDEN');
		expect(refusalOf({ ...nsa, assignmentReleased: false }, paper)).toBe('FORBIDDEN');
		expect(refusalOf({ ...nation, roleKind: null }, paper)).toBe('FORBIDDEN');
		expect(refusalOf({ ...nation, roleKind: 'CUSTOM' }, paper)).toBe('FORBIDDEN');
	});
});
