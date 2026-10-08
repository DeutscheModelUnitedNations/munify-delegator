import { client } from '$lib/api/rumbleClient/client';
import type { DeckWindowData, WindowEntry } from '$lib/assignment/deckWindow';
import { containing, personContains } from '$lib/components/tanStackTable/serverQuery';

const person = {
	id: true,
	givenName: true,
	familyName: true,
	email: true,
	birthday: true,
	gender: true,
	conferenceParticipationsCount: true,
	globalNotes: true
} as const;

const supervisors = {
	id: true,
	user: { id: true, givenName: true, familyName: true, email: true }
} as const;

/** What a card shows of a delegation. */
const delegationCard = {
	id: true,
	school: true,
	motivation: true,
	experience: true,
	members: {
		id: true,
		isHeadDelegate: true,
		user: person,
		supervisors
	},
	appliedForRoles: {
		id: true,
		rank: true,
		nation: { alpha3Code: true, alpha2Code: true },
		nonStateActor: { id: true, name: true, fontAwesomeIcon: true }
	}
} as const;

/** What a card shows of a single participant. */
const singleCard = {
	id: true,
	school: true,
	motivation: true,
	experience: true,
	user: person,
	supervisors,
	appliedForRoles: { id: true, name: true }
} as const;

/** Cards the deck window holds: what the strip can draw. */
const DECK_WINDOW = 60;

/** The most hits a search asks for per kind of application. */
const SEARCH_LIMIT = 20;
/** Words past this are ignored: every one of them has to match somewhere, which gets slower. */
const SEARCH_WORDS = 5;

export interface DeckFilter {
	status: string;
	school: string | null;
}

/** One card of the deck as the backend sends it. */
function plainEntry(entry: WindowEntry): WindowEntry {
	return {
		kind: entry.kind,
		id: entry.id,
		school: entry.school,
		size: entry.size,
		status: entry.status
	};
}

/**
 * A window of the sighting's deck, filtered and ordered by the backend: the entries around the
 * card asked for, where it is and the totals. A seek (`index`) wins over `currentId`. Copied out
 * of the query result, so holding it subscribes to nothing.
 */
export async function fetchSightingDeck(
	conferenceId: string,
	filter: DeckFilter,
	position: { currentId: string | null; index?: number }
): Promise<DeckWindowData> {
	const entry = { kind: true, id: true, school: true, size: true, status: true } as const;
	const deck = await client.query.sightingDeck({
		__args: {
			conferenceId,
			status: filter.status,
			school: filter.school,
			currentId: position.currentId,
			index: position.index ?? null,
			size: DECK_WINDOW
		},
		total: true,
		counts: { rated: true, flagged: true, disqualified: true, unrated: true },
		overallRated: true,
		overallTotal: true,
		index: true,
		start: true,
		entries: entry,
		current: entry,
		unreviewedPastWindow: entry
	});
	return {
		total: deck.total,
		counts: {
			rated: deck.counts.rated,
			flagged: deck.counts.flagged,
			disqualified: deck.counts.disqualified,
			unrated: deck.counts.unrated
		},
		overallRated: deck.overallRated,
		overallTotal: deck.overallTotal,
		index: deck.index,
		start: deck.start,
		entries: deck.entries.map(plainEntry),
		current: deck.current && plainEntry(deck.current),
		unreviewedPastWindow: deck.unreviewedPastWindow && plainEntry(deck.unreviewedPastWindow)
	};
}

/** A deck window with what it was asked for, which `SightingDeckWindow` goes on asking with. */
export interface LoadedSightingDeck {
	conferenceId: string;
	filter: DeckFilter;
	deck: DeckWindowData;
}

/** The first window of a deck: around `currentId`, or around the card taking its place. */
export async function loadSightingDeck(
	conferenceId: string,
	filter: DeckFilter,
	currentId: string | null
): Promise<LoadedSightingDeck> {
	return {
		conferenceId,
		filter,
		deck: await fetchSightingDeck(conferenceId, filter, { currentId })
	};
}

/** When the conference starts, which the cards count the participants' ages up to. */
export async function fetchStartConference(conferenceId: string) {
	const conference = await client.query.conference({
		__args: { id: conferenceId },
		startConference: true
	});
	return conference.startConference;
}

/**
 * The team's review of one application as the backend last had it. Read once rather than live
 * (live updates of it break Svelte's batching); what this browser saves since is in
 * `savedReviews`, which the page lays over it.
 */
export async function fetchReview(kind: 'delegation' | 'single', id: string) {
	const reviews = await client.query.assignmentReviews({
		__args: {
			where: kind === 'single' ? { singleParticipantId: { eq: id } } : { delegationId: { eq: id } },
			limit: 1
		},
		id: true,
		evaluation: true,
		flagged: true,
		disqualified: true,
		note: true
	});
	return reviews.at(0);
}

/** The schools matching a search, for the school filter. */
export async function searchSchools(conferenceId: string, search: string) {
	return client.query.sightingSchools({
		__args: { conferenceId, search, limit: 20 },
		school: true,
		applications: true,
		people: true
	});
}

/** One application with everything its card shows. */
export async function fetchApplication(kind: 'delegation' | 'single', id: string) {
	return kind === 'single'
		? { kind, single: await client.liveQuery.singleParticipant({ __args: { id }, ...singleCard }) }
		: {
				kind,
				delegation: await client.liveQuery.delegation({ __args: { id }, ...delegationCard })
			};
}

/** The cards already in the cache, by `kind:id`, so turning back and forth does not ask again. */
const warmed = new Set<string>();
let waiting: { kind: 'delegation' | 'single'; id: string }[] = [];
let warming = false;

/**
 * Warms the cache for the cards the team is likely to open next, nearest first, so turning to
 * them does not wait. One card at a time: a burst of them would hold the browser's few
 * connections to the host and hold up the card on top. A new call replaces what is still
 * waiting, since the team has moved on.
 */
export function prefetchCards(cards: readonly { kind: string; id: string }[]) {
	waiting = cards
		.map((card) => ({
			kind: card.kind === 'single' ? ('single' as const) : ('delegation' as const),
			id: card.id
		}))
		.filter((card) => !warmed.has(`${card.kind}:${card.id}`));
	if (!warming) void warmNext();
}

async function warmNext() {
	const card = waiting.shift();
	if (!card) {
		warming = false;
		return;
	}
	warming = true;
	warmed.add(`${card.kind}:${card.id}`);
	await Promise.all([
		card.kind === 'single'
			? client.query.singleParticipant({ __args: { id: card.id }, ...singleCard })
			: client.query.delegation({ __args: { id: card.id }, ...delegationCard }),
		fetchReview(card.kind, card.id)
	]).catch(() => warmed.delete(`${card.kind}:${card.id}`));
	await warmNext();
}

/**
 * The applications whose school, texts, members or supervisors contain every word of `search`,
 * or whose codename or id does, with what the card shows so the page can say what matched, and
 * where they stand in the sighting. Every filter of the sighting applies to them too.
 */
export async function searchApplications(conferenceId: string, search: string, filter: DeckFilter) {
	const words = search.split(/\s+/).filter(Boolean).slice(0, SEARCH_WORDS);
	if (words.length === 0) return { delegations: [], singleParticipants: [], entries: [] };
	const inConference = { conferenceId: { eq: conferenceId }, applied: { eq: true } };
	const texts = (like: { ilike: string }) => [
		{ school: like },
		{ motivation: like },
		{ experience: like }
	];

	const [delegations, singleParticipants, nameMatches] = await Promise.all([
		client.query.delegations({
			__args: {
				where: {
					...inConference,
					AND: words.map((word) => {
						const like = containing(word);
						return {
							OR: [
								...texts(like),
								{ members: { user: personContains(word) } },
								{ members: { supervisors: { user: personContains(word) } } }
							]
						};
					})
				},
				limit: SEARCH_LIMIT
			},
			...delegationCard
		}),
		client.query.singleParticipants({
			__args: {
				where: {
					...inConference,
					AND: words.map((word) => {
						const like = containing(word);
						return {
							OR: [
								...texts(like),
								{ user: personContains(word) },
								{ supervisors: { user: personContains(word) } }
							]
						};
					})
				},
				limit: SEARCH_LIMIT
			},
			...singleCard
		}),
		client.query.sightingNameMatches({ __args: { conferenceId, search }, id: true })
	]);
	const ids = [
		...new Set([
			...nameMatches.map((match) => match.id),
			...delegations.map((d) => d.id),
			...singleParticipants.map((s) => s.id)
		])
	];
	const entries = await client.query.sightingEntries({
		__args: { conferenceId, ids, status: filter.status, school: filter.school },
		kind: true,
		id: true,
		school: true,
		size: true,
		status: true
	});
	return { delegations, singleParticipants, entries };
}
