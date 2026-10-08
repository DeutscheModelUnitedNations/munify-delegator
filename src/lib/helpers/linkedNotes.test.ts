import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/paraglide/messages', () => ({
	m: { linkedAccountNote: ({ name }: { name: string }) => `Linked account (${name})` }
}));

const { careNotesOf, linkedAccountNotes } = await import('./linkedNotes');

const account = (givenName: string, familyName: string, globalNotes?: string | null) => ({
	givenName,
	familyName,
	globalNotes
});

describe('linkedAccountNotes', () => {
	it('collects the notes of the linked accounts from either side of a pair', () => {
		const notes = linkedAccountNotes({
			duplicatesAsUser: [{ candidate: account('Simón', 'Beworben', ' Ignored the team. ') }],
			duplicatesAsCandidate: [{ user: account('Simone', 'Beworben', 'Late twice.') }]
		});
		expect(notes).toEqual([
			{ name: 'Simón Beworben', note: 'Ignored the team.' },
			{ name: 'Simone Beworben', note: 'Late twice.' }
		]);
	});

	it('skips linked accounts without a note', () => {
		expect(
			linkedAccountNotes({
				duplicatesAsUser: [{ candidate: account('A', 'B', '  ') }, { candidate: account('C', 'D') }]
			})
		).toEqual([]);
	});
});

describe('careNotesOf', () => {
	it('is undefined for a person nobody noted anything about', () => {
		expect(careNotesOf({ globalNotes: ' ' })).toBeUndefined();
		expect(careNotesOf({})).toBeUndefined();
	});

	it('is the own note alone, or the linked notes alone', () => {
		expect(careNotesOf({ globalNotes: 'Own.' })).toBe('Own.');
		expect(
			careNotesOf({ duplicatesAsCandidate: [{ user: account('Old', 'Account', 'Before.') }] })
		).toBe('Linked account (Old Account)\nBefore.');
	});

	it('puts the own note first, then each linked one', () => {
		expect(
			careNotesOf({
				globalNotes: 'Own.',
				duplicatesAsUser: [{ candidate: account('Old', 'One', 'First.') }],
				duplicatesAsCandidate: [{ user: account('Old', 'Two', 'Second.') }]
			})
		).toBe('Own.\n\nLinked account (Old One)\nFirst.\n\nLinked account (Old Two)\nSecond.');
	});
});
