import {
	arrival,
	deckPosition,
	upcomingEntries,
	withReview,
	type DeckPosition,
	type DeckWindowData
} from './deckPosition';
import type { SightingReview } from './sighting';
import { toastError } from '../toastError';
import { fetchSightingDeck, type DeckFilter, type LoadedSightingDeck } from './applications';

/**
 * The deck of one filter as the page holds it: a window of the backend's deck and the card on top.
 *
 * A card inside the window is turned to at once, with nothing asked of the backend; that is what
 * keeps the sighting quick. The backend is asked for a new window in the background when the card
 * on top comes near the window's edge and after every review (for the colours and the counts), and
 * waited for only when somebody jumps to a card outside the window. The card on top is always one
 * the window holds.
 *
 * Its state is written from promise callbacks rather than awaited in a `$derived`: a window being
 * fetched never holds up the card that is turned to meanwhile.
 */
export function createSightingDeckWindow(loaded: LoadedSightingDeck) {
	const { conferenceId, filter } = loaded;
	let deck = $state.raw(loaded.deck);
	let currentId = $state(loaded.deck.current?.id ?? null);
	const position: DeckPosition = $derived(deckPosition({ deck, id: currentId }));
	/** A card outside the window that was turned to, until the window around it has arrived */
	let target: string | null = null;
	let requests = 0;
	let answered = 0;

	/** Asks for the window around a card, and takes only the latest request's answer (see `arrival`). */
	async function fetchWindow(at: {
		currentId: string | null;
		index?: number;
	}): Promise<string | null> {
		const request = ++requests;
		const fetched = await fetchSightingDeck({ conferenceId, filter, position: at })
			.catch((error: unknown) => {
				if (request === requests) toastError(error);
				return undefined;
			})
			.finally(() => {
				if (request === requests) answered = request;
			});
		if (!fetched || request !== requests) return currentId;

		const next = arrival({ deck: fetched, asked: at, wanted: target ?? currentId });
		if (!next.take) return fetchWindow({ currentId: next.askFor });
		target = null;
		deck = fetched;
		currentId = next.currentId;
		return currentId;
	}

	return {
		conferenceId,
		filter,
		get deck() {
			return deck;
		},
		get currentId() {
			return currentId;
		},
		get position() {
			return position;
		},

		/** The cards likely to be opened next, nearest first. */
		upcoming({ ahead, behind }: { ahead: number; behind: number }) {
			return upcomingEntries({ deck, id: currentId, ahead, behind });
		},

		/**
		 * Turns to a card: at once when the window holds it, otherwise once the window around it has
		 * arrived. Resolves with the card on top then.
		 */
		async goTo(id: string) {
			if (!deck.entries.some((entry) => entry.id === id)) {
				target = id;
				return fetchWindow({ currentId: id });
			}
			target = null;
			currentId = id;
			// One window on its way is enough; it is centred on a card close to this one.
			if (position.nearEdge && answered === requests) {
				void fetchWindow({ currentId: id });
			}
			return id;
		},

		/** Turns to the card at a place in the deck, for the slider. */
		seek(index: number) {
			return fetchWindow({ currentId: null, index });
		},

		/** Recolours a reviewed card right away, before the backend has the review. */
		recolour({ id, review }: { id: string; review: SightingReview }) {
			deck = withReview({ deck, id, review });
		},

		/** Asks for the window as the backend has it now: after a review, for its colours and counts. */
		refresh() {
			void fetchWindow({ currentId: target ?? currentId });
		}
	};
}

type SightingDeckWindow = ReturnType<typeof createSightingDeckWindow>;
