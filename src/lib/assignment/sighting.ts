import Fuse from 'fuse.js';
import { createFuzzySearch } from '$lib/components/tanStackTable/search';
import { getAgeAtConference } from '$lib/helpers/ageChecker';
/** Pure decisions behind the sighting: which applications to show, in which order. */

export interface SightingReview {
	evaluation?: number | null;
	flagged: boolean;
	disqualified: boolean;
	note?: string | null;
}

export interface SightingEntry {
	kind: 'delegation' | 'single';
	id: string;
	/** The name the application goes by in the sighting, so rating stays about the application. */
	codename: string;
	school: string | null;
	size: number;
	review: SightingReview | undefined;
	/** What a search looks through besides the codename, id, school and note, see `searchFieldsOf`. */
	fields?: SearchField[];
}

export type SightingStatus = 'all' | 'unrated' | 'rated' | 'flagged' | 'disqualified' | 'noted';

export const SIGHTING_STATUSES: SightingStatus[] = [
	'all',
	'unrated',
	'rated',
	'flagged',
	'disqualified',
	'noted'
];

/** Largest delegations first, single participants last, otherwise by codename. */
function sightingOrder(a: SightingEntry, b: SightingEntry) {
	if (a.kind !== b.kind) return a.kind === 'delegation' ? -1 : 1;
	if (a.size !== b.size) return b.size - a.size;
	return a.codename.localeCompare(b.codename);
}

const STATUS_MATCHERS: Record<SightingStatus, (review: SightingEntry['review']) => boolean> = {
	all: () => true,
	unrated: (review) => review?.evaluation == null && !review?.disqualified,
	rated: (review) => review?.evaluation != null,
	flagged: (review) => !!review?.flagged,
	disqualified: (review) => !!review?.disqualified,
	noted: (review) => !!review?.note
};

const matchesStatus = (entry: SightingEntry, status: SightingStatus) =>
	STATUS_MATCHERS[status](entry.review);

export type SearchFieldKind =
	| 'codename'
	| 'id'
	| 'school'
	| 'member'
	| 'memberEmail'
	| 'supervisor'
	| 'supervisorEmail'
	| 'motivation'
	| 'experience'
	| 'note';

export interface SearchField {
	kind: SearchFieldKind;
	value: string;
}

const searchTerms = (search: string) => search.split(/\s+/).filter(Boolean);

function fieldsOfEntry(entry: SightingEntry): SearchField[] {
	const own: SearchField[] = [
		{ kind: 'codename', value: entry.codename },
		{ kind: 'id', value: entry.id },
		{ kind: 'school', value: entry.school ?? '' },
		{ kind: 'note', value: entry.review?.note ?? '' }
	];
	return [...own, ...(entry.fields ?? [])].filter((field) => field.value);
}

const searchTextOf = (entry: SightingEntry) =>
	fieldsOfEntry(entry)
		.map((field) => field.value)
		.join(' ');

/** The fuzzy search over the codename, id, school, texts, people and the team's note of entries. */
export const searchSightings = (entries: readonly SightingEntry[]) =>
	createFuzzySearch(entries, searchTextOf);

/** A field a search matched, with the first occurrence marked: `value.slice(start, end)`. */
export interface MatchReason {
	kind: SearchFieldKind;
	value: string;
	start: number;
	end: number;
}

/** The longest stretch of a field that fuse matched, if any. */
function matchedRange(fuse: Fuse<SearchField>, term: string) {
	const hit = fuse.search(term)[0];
	if (!hit) return undefined;
	const indices = hit.matches?.flatMap((match) => match.indices) ?? [];
	const [start, end] = indices.reduce(
		(best, range) => (range[1] - range[0] > best[1] - best[0] ? range : best),
		[0, -1]
	);
	return { field: hit.item, start, end: end + 1 };
}

/** Why an entry matches: the field that fits each search term best, once per field. */
export function matchReasons(entry: SightingEntry, search: string): MatchReason[] {
	const fuse = new Fuse(fieldsOfEntry(entry), {
		keys: ['value'],
		threshold: 0.4,
		ignoreLocation: true,
		includeMatches: true
	});
	const reasons = new Map<SearchField, MatchReason>();
	for (const term of searchTerms(search)) {
		const found = matchedRange(fuse, term);
		if (found && !reasons.has(found.field)) {
			reasons.set(found.field, { ...found.field, start: found.start, end: found.end });
		}
	}
	return [...reasons.values()];
}

/** The match with some words around it, cut off with an ellipsis where the value goes on. */
export function snippetOf(reason: MatchReason, context = 30) {
	const from = Math.max(0, reason.start - context);
	const to = Math.min(reason.value.length, reason.end + context * 2);
	return {
		before: (from > 0 ? '…' : '') + reason.value.slice(from, reason.start),
		hit: reason.value.slice(reason.start, reason.end),
		after: reason.value.slice(reason.end, to) + (to < reason.value.length ? '…' : '')
	};
}

/**
 * The applications passing the filters. Without a search they come in the order of the deck;
 * with one, the best match first. `searcher` lets a caller keep the search index between calls.
 */
export function filterSightings(
	entries: readonly SightingEntry[],
	filter: { search: string; status: SightingStatus; school: string | null },
	searcher?: ReturnType<typeof searchSightings>
) {
	const searching = filter.search.trim() !== '';
	const matching = searching ? (searcher ?? searchSightings(entries))(filter.search) : entries;
	const passing = matching.filter(
		(entry) =>
			matchesStatus(entry, filter.status) &&
			(filter.school === null || (entry.school ?? '') === filter.school)
	);
	return searching ? passing : passing.toSorted(sightingOrder);
}

/** Applications and people per school, by school name; no school sorts as the empty name. */
export function schoolsOf(entries: readonly SightingEntry[]) {
	const schools = new Map<string, { school: string; applications: number; people: number }>();
	for (const entry of entries) {
		const school = entry.school ?? '';
		const summary = schools.get(school) ?? { school, applications: 0, people: 0 };
		summary.applications += 1;
		summary.people += entry.size;
		schools.set(school, summary);
	}
	return [...schools.values()].sort((a, b) => a.school.localeCompare(b.school));
}

type Nullable<T> = T | null | undefined;

interface Person {
	id: string;
	givenName: string;
	familyName: string;
	email?: Nullable<string>;
	birthday?: Nullable<Date | string>;
	gender?: Nullable<string>;
	conferenceParticipationsCount: number;
	globalNotes?: Nullable<string>;
}

interface Supervisor {
	id: string;
	user: { id: string; givenName: string; familyName: string; email?: Nullable<string> };
}

interface ApplicationTexts {
	school?: Nullable<string>;
	motivation?: Nullable<string>;
	experience?: Nullable<string>;
}

export interface SightedDelegation extends ApplicationTexts {
	members: readonly { isHeadDelegate: boolean; user: Person; supervisors: readonly Supervisor[] }[];
	appliedForRoles: readonly {
		rank: number;
		nation?: Nullable<{ alpha3Code: string; alpha2Code: string }>;
		nonStateActor?: Nullable<{ name: string; fontAwesomeIcon?: Nullable<string> }>;
	}[];
}

export interface SightedSingleParticipant extends ApplicationTexts {
	user: Person;
	supervisors: readonly Supervisor[];
	appliedForRoles: readonly { name: string }[];
}

const texts = (application: ApplicationTexts) => ({
	school: application.school ?? null,
	motivation: application.motivation ?? null,
	experience: application.experience ?? null
});

/** A wish as the sighting shows it: its name, and a flag for a nation or an icon for an actor. */
interface Wish {
	name: string;
	alpha2Code?: string;
	icon?: string;
}

const wishOf = (
	wish: SightedDelegation['appliedForRoles'][number],
	nationName: (code: string) => string
): Wish =>
	wish.nation
		? { name: nationName(wish.nation.alpha3Code), alpha2Code: wish.nation.alpha2Code }
		: {
				name: wish.nonStateActor?.name ?? '',
				icon: wish.nonStateActor?.fontAwesomeIcon ?? undefined
			};

/** A delegation's application as the sighting shows it; wishes in the order they were ranked. */
export function delegationApplication(
	delegation: SightedDelegation,
	nationName: (code: string) => string
) {
	return {
		...texts(delegation),
		people: delegation.members.map((member) => ({
			...member.user,
			isHeadDelegate: member.isHeadDelegate
		})),
		supervisors: delegation.members.flatMap((member) => member.supervisors),
		wishes: delegation.appliedForRoles
			.toSorted((a, b) => a.rank - b.rank)
			.map((wish) => wishOf(wish, nationName))
	};
}

/** A single participant's application, in the same shape as a delegation's. */
export function singleApplication(single: SightedSingleParticipant) {
	return {
		...texts(single),
		people: [{ ...single.user, isHeadDelegate: false }],
		supervisors: [...single.supervisors],
		wishes: single.appliedForRoles.map((role): Wish => ({ name: role.name }))
	};
}

/** What a search looks through of an application: school, texts, members and supervisors with their emails. */
export function searchFieldsOf(application: ReturnType<typeof singleApplication>): SearchField[] {
	const named = (
		kind: 'member' | 'supervisor',
		person: { givenName: string; familyName: string }
	) => ({ kind, value: `${person.givenName} ${person.familyName}` }) satisfies SearchField;
	const email = (kind: 'memberEmail' | 'supervisorEmail', address: Nullable<string>) =>
		({ kind, value: address ?? '' }) satisfies SearchField;
	const text = (kind: SearchFieldKind, value: Nullable<string>): SearchField => ({
		kind,
		value: value ?? ''
	});
	return [
		text('school', application.school),
		text('motivation', application.motivation),
		text('experience', application.experience),
		...application.people.flatMap((p) => [named('member', p), email('memberEmail', p.email)]),
		...application.supervisors.flatMap((s) => [
			named('supervisor', s.user),
			email('supervisorEmail', s.user.email)
		])
	].filter((field) => field.value);
}

/** The supervisors, each once: they appear once per member they supervise. */
export function distinctSupervisors(
	supervisors: readonly Supervisor[],
	format: (givenName: string, familyName: string) => string
) {
	return [...new Map(supervisors.map((s) => [s.id, s])).values()].map((s) => ({
		id: s.id,
		userId: s.user.id,
		name: format(s.user.givenName, s.user.familyName)
	}));
}

/** The average age at the conference (of those whose birthday is known) and the earlier conferences of all. */
export function memberSummary(
	people: readonly Person[],
	startConference: Date | string
): { averageAge: number | undefined; participations: number } {
	const ages = people.flatMap((p) =>
		p.birthday ? [getAgeAtConference(p.birthday, startConference)] : []
	);
	const known = ages.filter((age) => age !== undefined);
	return {
		averageAge: known.length ? known.reduce((sum, age) => sum + age, 0) / known.length : undefined,
		participations: people.reduce((sum, p) => sum + p.conferenceParticipationsCount, 0)
	};
}

const GENDER_ICONS: Record<string, string> = { FEMALE: 'venus', MALE: 'mars' };

/** The icon of a gender, a neutral one when it is unknown or neither. */
export const genderIcon = (gender: Nullable<string>) => GENDER_ICONS[gender ?? ''] ?? 'venus-mars';

/**
 * The arguments of `setAssignmentReview`, which takes the whole review: the current one with
 * `change` applied, for the delegation or single participant `id` names.
 */
export function reviewArgs(
	kind: SightingEntry['kind'],
	id: string,
	review: SightingReview | undefined,
	change: Partial<SightingReview>
) {
	const next = { flagged: false, disqualified: false, ...review, ...change };
	return {
		delegationId: kind === 'delegation' ? id : undefined,
		singleParticipantId: kind === 'single' ? id : undefined,
		evaluation: next.evaluation ?? undefined,
		flagged: next.flagged,
		disqualified: next.disqualified,
		note: next.note ?? undefined
	};
}

/** How far along the sighting an application is, for the strip showing the whole deck. */
export type DeckStatus = 'disqualified' | 'flagged' | 'rated' | 'unrated';

export function deckStatus(entry: SightingEntry): DeckStatus {
	const review = entry.review;
	if (review?.disqualified) return 'disqualified';
	if (review?.evaluation != null) return 'rated';
	return review?.flagged ? 'flagged' : 'unrated';
}

/**
 * Where `currentId` sits in the deck of applications under review. An id that is not in the deck
 * (it was filtered away, or never existed) falls back to the first card.
 */
export function deckPosition(deck: readonly SightingEntry[], currentId: string | null | undefined) {
	const found = deck.findIndex((entry) => entry.id === currentId);
	const index = found === -1 ? 0 : found;
	return {
		index,
		total: deck.length,
		current: deck.at(index),
		previousId: index > 0 ? deck[index - 1].id : undefined,
		nextId: deck.at(index + 1)?.id
	};
}

/** The next application after `currentId` that nobody has rated, flagged or excluded yet. */
export function nextUnreviewedId(deck: readonly SightingEntry[], currentId: string | undefined) {
	const start = deck.findIndex((entry) => entry.id === currentId) + 1;
	const ordered = [...deck.slice(start), ...deck.slice(0, start)];
	return ordered.find((entry) => deckStatus(entry) === 'unrated' && entry.id !== currentId)?.id;
}

/** The application a deck entry stands for, shaped for the card, out of everything fetched. */
export function applicationOf(
	entry: Pick<SightingEntry, 'kind' | 'id'>,
	applications: {
		delegations: readonly (SightedDelegation & { id: string })[];
		singleParticipants: readonly (SightedSingleParticipant & { id: string })[];
	},
	nationName: (code: string) => string
) {
	if (entry.kind === 'single') {
		const single = applications.singleParticipants.find((p) => p.id === entry.id);
		return single && singleApplication(single);
	}
	const delegation = applications.delegations.find((d) => d.id === entry.id);
	return delegation && delegationApplication(delegation, nationName);
}
