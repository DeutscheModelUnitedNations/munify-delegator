import { describe, expect, it } from 'vitest';
import {
	arrival,
	deckPosition,
	reviewStatus,
	upcomingEntries,
	withReview,
	WINDOW_MARGIN,
	type DeckWindowData,
	type WindowEntry
} from './deckWindow';

const entry = (id: string, status = 'unrated'): WindowEntry => ({
	kind: 'delegation',
	id,
	school: null,
	size: 1,
	status
});

/** A window of `length` cards `c<start>` … starting at `start` in a deck of `total`. */
function window(
	start: number,
	length: number,
	total: number,
	overrides: Partial<DeckWindowData> = {}
): DeckWindowData {
	const entries = Array.from({ length }, (_, offset) => entry(`c${start + offset}`));
	return {
		total,
		counts: { rated: 0, flagged: 0, disqualified: 0, unrated: total },
		overallRated: 0,
		overallTotal: total,
		index: start,
		start,
		entries,
		current: entries[0] ?? null,
		unreviewedPastWindow: null,
		...overrides
	};
}

describe('deckPosition', () => {
	it('turns within the window without the backend', () => {
		const position = deckPosition(window(10, 60, 200), 'c40');
		expect(position.index).toBe(40);
		expect(position.current?.id).toBe('c40');
		expect(position.previous?.id).toBe('c39');
		expect(position.next?.id).toBe('c41');
		expect(position.nearEdge).toBe(false);
	});

	it('knows nothing of a card outside the window', () => {
		const position = deckPosition(window(0, 10, 10), 'elsewhere');
		expect(position.current).toBeUndefined();
		expect(position.next).toBeUndefined();
	});

	it('moves the window along near an edge, unless the deck ends there', () => {
		const deck = window(10, 60, 200);
		expect(deckPosition(deck, `c${10 + WINDOW_MARGIN - 1}`).nearEdge).toBe(true);
		expect(deckPosition(deck, `c${69 - WINDOW_MARGIN + 1}`).nearEdge).toBe(true);
		const whole = window(0, 30, 30);
		expect(deckPosition(whole, 'c0').nearEdge).toBe(false);
		expect(deckPosition(whole, 'c29').nearEdge).toBe(false);
	});

	it('finds the next unrated card in the window first, then past it', () => {
		const deck = window(0, 5, 100, {
			unreviewedPastWindow: entry('c50')
		});
		deck.entries = deck.entries.map((e) => ({ ...e, status: 'rated' }));
		deck.entries[1].status = 'unrated';
		deck.entries[3].status = 'unrated';
		expect(deckPosition(deck, 'c0').nextUnreviewed?.id).toBe('c1');
		expect(deckPosition(deck, 'c1').nextUnreviewed?.id).toBe('c3');
		expect(deckPosition(deck, 'c3').nextUnreviewed?.id).toBe('c50');
	});

	it('does not offer the card on top as the next unrated one', () => {
		const deck = window(0, 3, 3, { unreviewedPastWindow: entry('c2') });
		expect(deckPosition(deck, 'c2').nextUnreviewed).toBeUndefined();
	});
});

describe('withReview', () => {
	it('recolours the card and the counts at once', () => {
		const deck = window(0, 3, 3);
		const reviewed = withReview(deck, 'c1', { evaluation: 4, flagged: false, disqualified: false });
		expect(reviewed.entries[1].status).toBe('rated');
		expect(reviewed.counts.rated).toBe(1);
		expect(reviewed.counts.unrated).toBe(2);
		expect(reviewed.overallRated).toBe(1);
		expect(deck.entries[1].status).toBe('unrated');
	});

	it('takes a rating back', () => {
		const deck = window(0, 2, 2, {
			counts: { rated: 1, flagged: 0, disqualified: 0, unrated: 1 },
			overallRated: 1
		});
		deck.entries[0].status = 'rated';
		const reviewed = withReview(deck, 'c0', {
			evaluation: null,
			flagged: true,
			disqualified: false
		});
		expect(reviewed.entries[0].status).toBe('flagged');
		expect(reviewed.counts).toEqual({ rated: 0, flagged: 1, disqualified: 0, unrated: 1 });
		expect(reviewed.overallRated).toBe(0);
	});

	it('leaves the window alone for a card outside it, or no change of status', () => {
		const deck = window(0, 2, 2);
		expect(withReview(deck, 'elsewhere', { flagged: true, disqualified: false })).toBe(deck);
		expect(withReview(deck, 'c0', { flagged: false, disqualified: false, note: 'x' })).toBe(deck);
	});
});

describe('reviewStatus', () => {
	it('ranks an exclusion over a rating over a flag', () => {
		expect(reviewStatus(undefined)).toBe('unrated');
		expect(reviewStatus({ evaluation: 3, flagged: true, disqualified: true })).toBe('disqualified');
		expect(reviewStatus({ evaluation: 3, flagged: true, disqualified: false })).toBe('rated');
		expect(reviewStatus({ evaluation: null, flagged: true, disqualified: false })).toBe('flagged');
	});
});

describe('upcomingEntries', () => {
	it('lists the nearest cards first, ahead before behind', () => {
		const ids = upcomingEntries(window(0, 10, 10), 'c5', 3, 1).map((e) => e.id);
		expect(ids).toEqual(['c6', 'c4', 'c7', 'c8']);
	});

	it('stops at the window', () => {
		const ids = upcomingEntries(window(0, 3, 3), 'c2', 3, 1).map((e) => e.id);
		expect(ids).toEqual(['c1']);
	});
});

describe('arrival', () => {
	const deck = window(0, 5, 5);

	it('keeps the card turned to on top when the window holds it', () => {
		expect(arrival(deck, { currentId: 'c1' }, 'c3')).toEqual({ take: true, currentId: 'c3' });
	});

	it('puts the card taking its place on top when the one asked for was filtered away', () => {
		const moved = { ...deck, current: deck.entries[2] };
		expect(arrival(moved, { currentId: 'gone' }, 'gone')).toEqual({ take: true, currentId: 'c2' });
	});

	it('asks again for a card turned to while the window was on its way', () => {
		expect(arrival(deck, { currentId: 'c1' }, 'far')).toEqual({ take: false, askFor: 'far' });
	});

	it('lets a seek take whatever lies at its place', () => {
		const sought = { ...deck, current: deck.entries[4] };
		expect(arrival(sought, { currentId: null, index: 4 }, 'c0')).toEqual({
			take: true,
			currentId: 'c4'
		});
	});

	it('takes an empty deck', () => {
		const empty = window(0, 0, 0, { current: null });
		expect(arrival(empty, { currentId: 'c0' }, 'c0')).toEqual({ take: true, currentId: null });
	});
});
