import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeckWindowData, WindowEntry } from '$lib/assignment/deckWindow';

const fetchSightingDeck = vi.fn();
vi.mock('./applications', () => ({
	fetchSightingDeck: (...args: unknown[]) => fetchSightingDeck(...args)
}));
const toastError = vi.fn();
vi.mock('../toastError', () => ({ toastError: (error: unknown) => toastError(error) }));

const { SightingDeckWindow } = await import('./deckWindow.svelte');

const entry = (id: string): WindowEntry => ({
	kind: 'delegation',
	id,
	school: null,
	size: 1,
	status: 'unrated'
});

/** The window of `length` cards `c<start>` … in a deck of `total`, asked for around `current`. */
function window(start: number, length: number, total: number, current: string): DeckWindowData {
	const entries = Array.from({ length }, (_, offset) => entry(`c${start + offset}`));
	return {
		total,
		counts: { rated: 0, flagged: 0, disqualified: 0, unrated: total },
		overallRated: 0,
		overallTotal: total,
		index: Number(current.slice(1)),
		start,
		entries,
		current: entries.find((e) => e.id === current) ?? null,
		unreviewedPastWindow: null
	};
}

const filter = { status: 'all', school: null };
const deckWindow = (deck: DeckWindowData) =>
	new SightingDeckWindow({ conferenceId: 'conf', filter, deck });

/** A request the test answers when it chooses to. */
function pending() {
	let answer!: (deck: DeckWindowData) => void;
	fetchSightingDeck.mockImplementationOnce(
		() => new Promise<DeckWindowData>((resolve) => (answer = resolve))
	);
	return (deck: DeckWindowData) => answer(deck);
}

beforeEach(() => {
	fetchSightingDeck.mockReset();
	toastError.mockReset();
});

describe('SightingDeckWindow', () => {
	it('turns within the window without asking the backend', async () => {
		const sighting = deckWindow(window(0, 60, 60, 'c0'));
		expect(await sighting.goTo('c5')).toBe('c5');
		expect(sighting.position.index).toBe(5);
		expect(fetchSightingDeck).not.toHaveBeenCalled();
	});

	it('moves the window along in the background near its edge', async () => {
		const sighting = deckWindow(window(0, 60, 200, 'c30'));
		const answer = pending();
		expect(await sighting.goTo('c50')).toBe('c50');
		expect(fetchSightingDeck).toHaveBeenCalledWith('conf', filter, { currentId: 'c50' });
		// a second turn near the edge does not ask again while the first window is on its way
		await sighting.goTo('c51');
		expect(fetchSightingDeck).toHaveBeenCalledTimes(1);
		answer(window(20, 60, 200, 'c50'));
		await vi.waitFor(() => expect(sighting.deck.start).toBe(20));
		expect(sighting.currentId).toBe('c51');
	});

	it('waits for the window around a card outside it', async () => {
		const sighting = deckWindow(window(0, 60, 200, 'c0'));
		fetchSightingDeck.mockResolvedValueOnce(window(100, 60, 200, 'c130'));
		expect(await sighting.goTo('c130')).toBe('c130');
		expect(sighting.position.previous?.id).toBe('c129');
	});

	it('seeks to whatever lies at a place', async () => {
		const sighting = deckWindow(window(0, 60, 200, 'c0'));
		fetchSightingDeck.mockResolvedValueOnce(window(90, 60, 200, 'c120'));
		expect(await sighting.seek(120)).toBe('c120');
		expect(fetchSightingDeck).toHaveBeenCalledWith('conf', filter, { currentId: null, index: 120 });
	});

	it('only takes the latest answer', async () => {
		const sighting = deckWindow(window(0, 10, 10, 'c0'));
		const first = pending();
		sighting.refresh();
		fetchSightingDeck.mockResolvedValueOnce(window(0, 10, 10, 'c0'));
		sighting.refresh();
		first({ ...window(0, 10, 10, 'c0'), total: 99 });
		await vi.waitFor(() => expect(fetchSightingDeck).toHaveBeenCalledTimes(2));
		await Promise.resolve();
		expect(sighting.deck.total).toBe(10);
	});

	it('recolours a reviewed card at once', () => {
		const sighting = deckWindow(window(0, 3, 3, 'c0'));
		sighting.recolour('c1', { evaluation: 5, flagged: false, disqualified: false });
		expect(sighting.deck.entries[1].status).toBe('rated');
		expect(sighting.deck.counts.rated).toBe(1);
	});

	it('shows a failed request and keeps the card on top', async () => {
		const sighting = deckWindow(window(0, 60, 200, 'c0'));
		fetchSightingDeck.mockRejectedValueOnce(new Error('offline'));
		expect(await sighting.goTo('c150')).toBe('c0');
		expect(toastError).toHaveBeenCalledOnce();
	});

	it('lists the cards to read ahead', () => {
		const sighting = deckWindow(window(0, 10, 10, 'c4'));
		expect(sighting.upcoming(2, 1).map((e) => e.id)).toEqual(['c5', 'c3', 'c6']);
	});
});
