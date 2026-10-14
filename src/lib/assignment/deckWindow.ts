/**
 * The sighting's deck as the browser holds it: a window the backend cut out around one card. The
 * cards inside it are turned here, without asking the backend; it is only asked again for a card
 * outside the window, once the card on top comes near the window's edge, and after a review.
 */
import { entryStatus, type DeckStatus, type SightingReview } from './sighting';

export interface WindowEntry {
	kind: string;
	id: string;
	school: string | null;
	size: number;
	status: string;
}

export interface DeckWindowData<E extends WindowEntry = WindowEntry> {
	total: number;
	counts: Record<DeckStatus, number>;
	overallRated: number;
	overallTotal: number;
	/** The backend's place of the card the window was asked for */
	index: number;
	/** Where in the filtered deck the window starts */
	start: number;
	entries: E[];
	/** The card the window was asked for, or the one taking its place when the filters hide it */
	current: E | null;
	/** The first unrated card after the window, or else the deck's first unrated card */
	unreviewedPastWindow: E | null;
}

export interface DeckPosition<E extends WindowEntry = WindowEntry> {
	index: number;
	current: E | undefined;
	previous: E | undefined;
	next: E | undefined;
	nextUnreviewed: E | undefined;
	/** The card on top is close enough to an edge of the window that the deck goes on past it */
	nearEdge: boolean;
}

/** How close to the window's edge the card on top may come before the window is moved along. */
export const WINDOW_MARGIN = 15;

/** Where `id` lies in the window, and the cards to step to from there. */
export function deckPosition<E extends WindowEntry>(
	deck: DeckWindowData<E>,
	id: string | null
): DeckPosition<E> {
	const offset = id === null ? -1 : deck.entries.findIndex((entry) => entry.id === id);
	if (offset < 0) {
		return {
			index: 0,
			current: undefined,
			previous: undefined,
			next: undefined,
			nextUnreviewed: undefined,
			nearEdge: false
		};
	}
	const current = deck.entries[offset];
	const past = deck.unreviewedPastWindow;
	const end = deck.start + deck.entries.length;
	return {
		index: deck.start + offset,
		current,
		previous: deck.entries[offset - 1],
		next: deck.entries[offset + 1],
		nextUnreviewed:
			deck.entries.slice(offset + 1).find((entry) => entry.status === 'unrated') ??
			(past && past.id !== current.id ? past : undefined),
		nearEdge:
			(offset < WINDOW_MARGIN && deck.start > 0) ||
			(deck.entries.length - 1 - offset < WINDOW_MARGIN && end < deck.total)
	};
}

/** How far the sighting has come with an application under `review`; the backend's rule. */
export function reviewStatus(review: SightingReview | undefined): DeckStatus {
	if (review?.disqualified) return 'disqualified';
	if (review?.evaluation !== null && review?.evaluation !== undefined) return 'rated';
	if (review?.flagged) return 'flagged';
	return 'unrated';
}

const countsAsRated = (status: DeckStatus) => status === 'rated' || status === 'disqualified';

/**
 * The window as it stands once `id` was reviewed: its card and the counts recoloured right away,
 * until the backend's answer replaces them. Whether the card still passes the filters is the
 * backend's to say.
 */
export function withReview<E extends WindowEntry>(
	deck: DeckWindowData<E>,
	id: string,
	review: SightingReview
): DeckWindowData<E> {
	const entry = deck.entries.find((candidate) => candidate.id === id);
	if (!entry) return deck;
	const before = entryStatus(entry.status);
	const after = reviewStatus(review);
	if (before === after) return deck;
	const counts = { ...deck.counts };
	counts[before] = Math.max(0, counts[before] - 1);
	counts[after] += 1;
	const rated = Number(countsAsRated(after)) - Number(countsAsRated(before));
	return {
		...deck,
		counts,
		overallRated: deck.overallRated + rated,
		entries: deck.entries.map((candidate) =>
			candidate.id === id ? { ...candidate, status: after } : candidate
		)
	};
}

/**
 * The cards likely to be opened next, nearest first: `ahead` after the card on top, interleaved
 * with `behind` before it.
 */
export function upcomingEntries<E extends WindowEntry>(
	deck: DeckWindowData<E>,
	id: string | null,
	ahead: number,
	behind: number
): E[] {
	const offset = id === null ? -1 : deck.entries.findIndex((entry) => entry.id === id);
	if (offset < 0) return [];
	const cards: E[] = [];
	for (let step = 1; step <= Math.max(ahead, behind); step++) {
		const after = deck.entries[offset + step];
		const before = deck.entries[offset - step];
		if (step <= ahead && after) cards.push(after);
		if (step <= behind && before) cards.push(before);
	}
	return cards;
}

/** What to do with a window that arrived: take it with this card on top, or ask for another one. */
export type Arrival = { take: true; currentId: string | null } | { take: false; askFor: string };

/**
 * Which card goes on top once the window asked for (`asked`) has arrived, `wanted` being the card
 * turned to last. A seek takes whatever lies at the place it asked for. Otherwise the wanted card
 * stays on top if the window holds it; if it does not, it was either filtered away (and the card
 * taking its place goes on top) or turned to while the window was on its way, which asks for the
 * window around it instead.
 */
export function arrival(
	deck: DeckWindowData,
	asked: { currentId: string | null; index?: number },
	wanted: string | null
): Arrival {
	const replacement = { take: true, currentId: deck.current?.id ?? null } as const;
	if (asked.index !== undefined || wanted === null) return replacement;
	if (deck.entries.some((entry) => entry.id === wanted)) return { take: true, currentId: wanted };
	return wanted === asked.currentId ? replacement : { take: false, askFor: wanted };
}
