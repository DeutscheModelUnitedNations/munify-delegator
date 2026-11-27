import { describe, expect, test } from 'vitest';
import {
	agendaItemsWithoutPoints,
	committeeChanges,
	committeeDeletable,
	committeeDraftOf,
	committeeDraftValid,
	inCreationOrder,
	selectedCommittee
} from './committeeChanges';

const stored = {
	name: 'Sicherheitsrat',
	abbreviation: 'SR',
	resolutionHeadline: 'Der Sicherheitsrat',
	numOfSeatsPerDelegation: 1
};

const base = committeeDraftOf(stored);

describe('committeeChanges', () => {
	test('nothing changed sends nothing', () => {
		expect(committeeChanges({ base, draft: committeeDraftOf(stored) })).toBeUndefined();
	});

	test('sends only the changed fields, trimmed', () => {
		expect(committeeChanges({ base, draft: { ...base, name: ' Rat ', seats: 2 } })).toEqual({
			name: 'Rat',
			abbreviation: undefined,
			resolutionHeadline: undefined,
			numOfSeatsPerDelegation: 2
		});
	});

	test('an emptied headline clears it', () => {
		expect(
			committeeChanges({ base, draft: { ...base, resolutionHeadline: ' ' } })?.resolutionHeadline
		).toBeNull();
	});

	test('a field left alone is not sent, even when it was saved elsewhere meanwhile', () => {
		// the name changed elsewhere; the form still shows the old one and only edited the seats
		const draft = { ...base, seats: 3 };
		expect(committeeChanges({ base, draft })).toEqual({
			name: undefined,
			abbreviation: undefined,
			resolutionHeadline: undefined,
			numOfSeatsPerDelegation: 3
		});
	});

	test('a headline added to a committee without one', () => {
		const without = { ...stored, resolutionHeadline: null };
		expect(committeeDraftOf(without).resolutionHeadline).toBe('');
		expect(
			committeeChanges({
				base: committeeDraftOf(without),
				draft: { ...committeeDraftOf(without), resolutionHeadline: 'Die Versammlung' }
			})?.resolutionHeadline
		).toBe('Die Versammlung');
	});
});

describe('committeeDraftValid', () => {
	test('needs a name, an abbreviation and a seat', () => {
		expect(committeeDraftValid(committeeDraftOf(stored))).toBe(true);
		expect(committeeDraftValid({ ...committeeDraftOf(stored), name: ' ' })).toBe(false);
		expect(committeeDraftValid({ ...committeeDraftOf(stored), abbreviation: '' })).toBe(false);
		expect(committeeDraftValid({ ...committeeDraftOf(stored), seats: 0 })).toBe(false);
	});
});

describe('committeeDeletable / agendaItemsWithoutPoints', () => {
	const item = (papers: number, points: string[]) => ({
		id: 'i',
		title: 't',
		teaserText: null,
		discussionPoints: points,
		papers: Array.from({ length: papers }, (_, index) => ({ id: `p${index}` }))
	});

	test('a committee with delegates or papers cannot be deleted', () => {
		expect(committeeDeletable({ delegationMembers: [], agendaItems: [item(0, [])] })).toBe(true);
		expect(committeeDeletable({ delegationMembers: [{ id: 'd' }], agendaItems: [] })).toBe(false);
		expect(committeeDeletable({ delegationMembers: [], agendaItems: [item(1, [])] })).toBe(false);
	});

	test('counts the agenda items without points', () => {
		expect(
			agendaItemsWithoutPoints({ agendaItems: [item(0, []), item(0, ['a']), item(0, [])] })
		).toBe(2);
	});
});

describe('inCreationOrder', () => {
	test('by creation, committees created at once by id, whatever order they came in', () => {
		const at = (iso: string) => new Date(iso);
		const committees = [
			{ id: 'sr', createdAt: at('2026-01-01T00:00:00Z') },
			{ id: 'late', createdAt: at('2026-02-01T00:00:00Z') },
			{ id: 'gv', createdAt: at('2026-01-01T00:00:00Z') }
		];
		expect(inCreationOrder(committees).map((c) => c.id)).toEqual(['gv', 'sr', 'late']);
		expect(inCreationOrder([...committees].reverse()).map((c) => c.id)).toEqual([
			'gv',
			'sr',
			'late'
		]);
	});
});

describe('selectedCommittee', () => {
	const committees = [{ id: 'a' }, { id: 'b' }];

	test('the one the URL names, else the first', () => {
		expect(selectedCommittee({ committees, id: 'b' })?.id).toBe('b');
		expect(selectedCommittee({ committees, id: 'gone' })?.id).toBe('a');
		expect(selectedCommittee({ committees, id: null })?.id).toBe('a');
		expect(selectedCommittee({ committees: [], id: 'a' })).toBeUndefined();
	});
});
