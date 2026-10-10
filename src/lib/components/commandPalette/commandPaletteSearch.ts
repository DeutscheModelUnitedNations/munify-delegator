import { client } from '$lib/api/rumbleClient/client';
import {
	getFullTranslatedCountryNameFromISO3Code,
	translatedNationCodeAddressFormOptions
} from '$lib/utils/nationTranslationHelper.svelte';
import Fuse from 'fuse.js';
import {
	userParticipationType,
	type SearchDelegation,
	type SearchCommittee,
	type SearchForeignUser,
	type SearchSeat,
	type SearchTransaction,
	type SearchUser
} from './commandPaletteItems';

/**
 * The organizers' search box, on rumble's `search` argument: trigram similarity over the columns
 * the caller may read, ranked best match first. One query per table, run in parallel.
 *
 * rumble compares the term with each column on its own, so "anna schmidt" matches neither the
 * given name nor the family name. People are therefore searched one word at a time and only those
 * every word found are kept, which leaves each word as tolerant of typos as the trigram match.
 */

const RESULT_LIMIT = 10;
const MIN_SEARCH_LENGTH = 2;

/** Candidates asked for per word, so the people every word found can still be told apart. */
const WORD_CANDIDATES = 50;

/**
 * The rows `find` returns for every word of the term, best match for the first word first.
 * A single word is one query; with several, a row has to turn up for each of them.
 */
export async function searchEveryWord<T extends { id: string }>(
	words: string[],
	find: (word: string, limit: number) => Promise<T[]>,
	resultLimit = RESULT_LIMIT
): Promise<T[]> {
	const [first, ...rest] = words;
	if (!first) return [];
	if (rest.length === 0) return find(first, resultLimit);

	const [firstMatches, ...otherMatches] = await Promise.all(
		words.map((word) => find(word, WORD_CANDIDATES))
	);
	const otherIds = otherMatches.map((matches) => new Set(matches.map((row) => row.id)));
	return firstMatches
		.filter((row) => otherIds.every((ids) => ids.has(row.id)))
		.slice(0, resultLimit);
}

/** Membership in the conference through any of the four possible roles. */
function participatesIn(conferenceId: string) {
	const inConference = { conferenceId: { eq: conferenceId } };
	return {
		OR: [
			{ delegationMemberships: inConference },
			{ singleParticipant: inConference },
			{ conferenceSupervisor: inConference },
			{ teamMember: inConference },
			{ waitingListEntry: inConference }
		]
	};
}

const nationFuse = new Fuse(translatedNationCodeAddressFormOptions, {
	keys: ['label'],
	threshold: 0.3
});

/** The nations whose translated name resembles the term; rumble only knows their codes. */
function matchingNationCodes(term: string) {
	return nationFuse.search(term, { limit: 5 }).map((match) => match.item.value);
}

/**
 * Seats by name, with their holders. Nation names exist only translated on the client, so they
 * are matched here and handed to the API as codes; non-state actors and roles are matched on the
 * server by substring.
 */
function delegationSeatTitle(delegation: {
	id: string;
	assignedNationAlpha3Code: string | null;
	assignedNonStateActor: { name: string } | null;
}) {
	if (delegation.assignedNationAlpha3Code) {
		return getFullTranslatedCountryNameFromISO3Code(delegation.assignedNationAlpha3Code);
	}
	return delegation.assignedNonStateActor?.name ?? delegation.id;
}

async function searchSeats(conferenceId: string, term: string): Promise<SearchSeat[]> {
	const nameLike = { ilike: `%${term}%` };
	const nationCodes = matchingNationCodes(term);
	const heldSeat = [
		...(nationCodes.length > 0 ? [{ assignedNationAlpha3Code: { in: nationCodes } }] : []),
		{ assignedNonStateActor: { OR: [{ name: nameLike }, { abbreviation: nameLike }] } }
	];

	const [delegations, singles] = await Promise.all([
		client.query.delegations({
			__args: {
				where: { conferenceId: { eq: conferenceId }, OR: heldSeat },
				limit: RESULT_LIMIT
			},
			id: true,
			school: true,
			assignedNationAlpha3Code: true,
			assignedNonStateActor: { name: true },
			members: { isHeadDelegate: true, user: { id: true } }
		}),
		client.query.singleParticipants({
			__args: {
				where: { conferenceId: { eq: conferenceId }, assignedRole: { name: nameLike } },
				limit: RESULT_LIMIT
			},
			id: true,
			assignedRole: { name: true },
			user: { id: true, givenName: true, familyName: true }
		})
	]);

	return [
		...delegations.map((delegation) => ({
			id: delegation.id,
			title: delegationSeatTitle(delegation),
			subtitle: delegation.school,
			holderUserId: delegation.members.find((member) => member.isHeadDelegate)?.user.id ?? null
		})),
		...singles.map((single) => ({
			id: single.id,
			title: single.assignedRole?.name ?? single.id,
			subtitle: `${single.user.givenName} ${single.user.familyName}`,
			holderUserId: single.user.id
		}))
	];
}

async function searchCommittees(conferenceId: string, term: string): Promise<SearchCommittee[]> {
	const [committees, agendaItems] = await Promise.all([
		client.query.committees({
			__args: { search: term, where: { conferenceId: { eq: conferenceId } }, limit: RESULT_LIMIT },
			id: true,
			name: true,
			abbreviation: true
		}),
		client.query.committeeAgendaItems({
			__args: {
				search: term,
				where: { committee: { conferenceId: { eq: conferenceId } } },
				limit: RESULT_LIMIT
			},
			id: true,
			title: true,
			committee: { abbreviation: true }
		})
	]);

	return [
		...committees.map((committee) => ({
			id: committee.id,
			title: committee.name,
			subtitle: committee.abbreviation
		})),
		...agendaItems.map((item) => ({
			id: item.id,
			title: item.title,
			subtitle: item.committee.abbreviation
		}))
	];
}

interface SearchResults {
	users: SearchUser[];
	delegations: SearchDelegation[];
	seats: SearchSeat[];
	committees: SearchCommittee[];
	foreignUsers: SearchForeignUser[];
	transactions: SearchTransaction[];
}

/** The parts a person may hold in one conference, which decide whether they take part in it. */
export function participation(conferenceId: string) {
	const inConference = { conferenceId: { eq: conferenceId } };
	return {
		delegationMemberships: { __args: { where: inConference }, id: true },
		singleParticipant: { __args: { where: inConference }, id: true },
		conferenceSupervisor: { __args: { where: inConference }, id: true },
		teamMember: { __args: { where: inConference }, id: true },
		waitingListEntry: { __args: { where: inConference }, id: true }
	} as const;
}

export async function searchConference(
	conferenceId: string,
	searchTerm: string
): Promise<SearchResults> {
	const words = searchTerm.trim().split(/\s+/);
	if (!words[0] || searchTerm.trim().length < MIN_SEARCH_LENGTH) {
		return {
			users: [],
			delegations: [],
			seats: [],
			committees: [],
			foreignUsers: [],
			transactions: []
		};
	}
	const inConference = { conferenceId: { eq: conferenceId } };

	const [users, cardHolders, foreignUsers, delegations, transactions, seats, committees] =
		await Promise.all([
			searchEveryWord(words, (search, limit) =>
				client.query.users({
					__args: { search, where: participatesIn(conferenceId), limit },
					id: true,
					givenName: true,
					familyName: true,
					email: true,
					...participation(conferenceId)
				})
			),
			// The access card of the external ID card, so scanning or typing it finds its owner. Only
			// rows the caller may read come back.
			client.query.conferenceParticipantStatuses({
				__args: {
					where: { ...inConference, accessCardId: { ilike: `%${searchTerm.trim()}%` } },
					limit: RESULT_LIMIT
				},
				user: {
					id: true,
					givenName: true,
					familyName: true,
					email: true,
					...participation(conferenceId)
				}
			}),
			searchEveryWord(words, (search, limit) =>
				client.query.users({
					__args: { search, where: { NOT: participatesIn(conferenceId) }, limit },
					id: true,
					givenName: true,
					familyName: true,
					email: true
				})
			),
			// `entryCode` is the delegation's join secret, masked for team members who do not hand it
			// out, and a masked column fails the whole query: it is neither selected nor searched.
			client.query.delegations({
				__args: { search: searchTerm.trim(), where: inConference, limit: RESULT_LIMIT },
				id: true,
				school: true,
				members: { isHeadDelegate: true, user: { id: true } }
			}),
			client.query.paymentTransactions({
				__args: { search: searchTerm.trim(), where: inConference, limit: RESULT_LIMIT },
				id: true,
				amount: true,
				recievedAt: true,
				conference: { currency: true }
			}),
			searchSeats(conferenceId, searchTerm.trim()),
			searchCommittees(conferenceId, searchTerm.trim())
		]);

	return {
		seats,
		committees,
		users: [...cardHolders.map((status) => status.user), ...users]
			.filter((user, index, all) => all.findIndex((other) => other.id === user.id) === index)
			.map((user) => ({
				id: user.id,
				email: user.email,
				givenName: user.givenName,
				familyName: user.familyName,
				participationType: userParticipationType(user)
			})),
		foreignUsers: foreignUsers.map((user) => ({
			id: user.id,
			email: user.email,
			givenName: user.givenName,
			familyName: user.familyName
		})),
		delegations: delegations.map((delegation) => ({
			id: delegation.id,
			school: delegation.school,
			memberCount: delegation.members.length,
			headDelegateUserId:
				delegation.members.find((member) => member.isHeadDelegate)?.user.id ?? null
		})),
		transactions: transactions.map((transaction) => ({
			id: transaction.id,
			amount: transaction.amount,
			currency: transaction.conference.currency ?? 'EUR',
			recievedAt: transaction.recievedAt ? transaction.recievedAt.toISOString() : null
		}))
	};
}
