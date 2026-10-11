import {
	arrival,
	deckPosition,
	upcomingEntries,
	withReview,
	type DeckPosition,
	type DeckWindowData
} from '$lib/assignment/deckWindow';
import type { SightingReview } from '$lib/assignment/sighting';
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
export class SightingDeckWindow {
	readonly conferenceId: string;
	readonly filter: DeckFilter;
	deck: DeckWindowData;
	currentId: string | null;
	readonly position: DeckPosition;
	/** A card outside the window that was turned to, until the window around it has arrived */
	#target: string | null = null;
	#requests = 0;
	#answered = 0;

	constructor(loaded: LoadedSightingDeck) {
		this.conferenceId = loaded.conferenceId;
		this.filter = loaded.filter;
		this.deck = $state.raw(loaded.deck);
		this.currentId = $state(loaded.deck.current?.id ?? null);
		this.position = $derived(deckPosition(this.deck, this.currentId));
	}

	/** The cards likely to be opened next, nearest first. */
	upcoming(ahead: number, behind: number) {
		return upcomingEntries(this.deck, this.currentId, ahead, behind);
	}

	/**
	 * Turns to a card: at once when the window holds it, otherwise once the window around it has
	 * arrived. Resolves with the card on top then.
	 */
	async goTo(id: string) {
		if (!this.deck.entries.some((entry) => entry.id === id)) {
			this.#target = id;
			return this.#fetch({ currentId: id });
		}
		this.#target = null;
		this.currentId = id;
		// One window on its way is enough; it is centred on a card close to this one.
		if (this.position.nearEdge && this.#answered === this.#requests) {
			void this.#fetch({ currentId: id });
		}
		return id;
	}

	/** Turns to the card at a place in the deck, for the slider. */
	seek(index: number) {
		return this.#fetch({ currentId: null, index });
	}

	/** Recolours a reviewed card right away, before the backend has the review. */
	recolour(id: string, review: SightingReview) {
		this.deck = withReview(this.deck, id, review);
	}

	/** Asks for the window as the backend has it now: after a review, for its colours and counts. */
	refresh() {
		void this.#fetch({ currentId: this.#target ?? this.currentId });
	}

	/** Asks for the window around a card, and takes only the latest request's answer (see `arrival`). */
	async #fetch(position: { currentId: string | null; index?: number }): Promise<string | null> {
		const request = ++this.#requests;
		const deck = await fetchSightingDeck(this.conferenceId, this.filter, position)
			.catch((error: unknown) => {
				if (request === this.#requests) toastError(error);
				return undefined;
			})
			.finally(() => {
				if (request === this.#requests) this.#answered = request;
			});
		if (!deck || request !== this.#requests) return this.currentId;

		const next = arrival(deck, position, this.#target ?? this.currentId);
		if (!next.take) return this.#fetch({ currentId: next.askFor });
		this.#target = null;
		this.deck = deck;
		this.currentId = next.currentId;
		return this.currentId;
	}
}
