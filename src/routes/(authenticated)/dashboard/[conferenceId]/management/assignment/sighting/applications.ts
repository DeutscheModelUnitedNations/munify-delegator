import { client } from '$lib/api/rumbleClient/client';
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

/**
 * A window of the sighting's deck, filtered and ordered by the backend: the entries around the
 * card on top, where it is, the totals and the cards to step to. `revision` counts the reviews saved
 * here; it only makes the page ask again (a request with the same variables is answered from the cache). A seek (`index`)
 * wins over `currentId`.
 */
export async function fetchSightingDeck(
	conferenceId: string,
	filter: DeckFilter,
	position: { currentId: string | null; index?: number },
	revision: number
) {
	const entry = { kind: true, id: true, school: true, size: true, status: true } as const;
	const [deck, conference] = await Promise.all([
		client.query.sightingDeck({
			__args: {
				conferenceId,
				status: filter.status,
				school: filter.school,
				currentId: position.currentId,
				index: position.index ?? null,
				size: DECK_WINDOW,
				revision
			},
			total: true,
			counts: { rated: true, flagged: true, disqualified: true, unrated: true },
			overallRated: true,
			overallTotal: true,
			index: true,
			start: true,
			entries: entry,
			current: entry,
			previous: entry,
			next: entry,
			nextUnreviewed: entry
		}),
		client.query.conference({ __args: { id: conferenceId }, startConference: true })
	]);
	return { ...deck, startConference: conference.startConference };
}

export type LoadedSightingDeck = Awaited<ReturnType<typeof fetchSightingDeck>>;

/** The id of the card at a place in the filtered deck, for the slider. */
export async function fetchIdAtIndex(conferenceId: string, filter: DeckFilter, index: number) {
	const deck = await client.query.sightingDeck({
		__args: {
			conferenceId,
			status: filter.status,
			school: filter.school,
			index,
			size: 1
		},
		current: { id: true }
	});
	return deck.current?.id;
}

/**
 * The team's review of one application. Read once rather than live (live updates of it break
 * Svelte's batching under the awaited deck) and asked for again whenever this browser saves a
 * review: `saves` goes into `limit`, which a unique application cannot exceed, only to make it a
 * different request than the cached one.
 */
export async function fetchReview(kind: 'delegation' | 'single', id: string, saves: number) {
	const reviews = await client.query.assignmentReviews({
		__args: {
			where: kind === 'single' ? { singleParticipantId: { eq: id } } : { delegationId: { eq: id } },
			limit: saves + 1
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

/** Warms the cache for the card the team is likely to open next, so turning it does not wait. */
export function prefetchApplication(kind: 'delegation' | 'single', id: string) {
	return kind === 'single'
		? client.query.singleParticipant({ __args: { id }, ...singleCard })
		: client.query.delegation({ __args: { id }, ...delegationCard });
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
