import { client } from '#lib/api/rumbleClient/client';
import { logger } from '#lib/logger';
import { containing } from '#lib/api/queryHelpers';
import {
	getFullTranslatedCountryNameFromISO3Code,
	translatedNationCodeAddressFormOptions
} from '#lib/utils/nationTranslationHelper.svelte.js';
import Fuse from 'fuse.js';
import { delegationSchoolsLabel } from '#lib/helpers/delegationSchools';
import {
	userParticipationType,
	type SearchDelegation,
	type SearchCommittee,
	type SearchForeignUser,
	type SearchSchool,
	type SearchSeat,
	type SearchTransaction,
	type SearchUser
} from './commandPaletteItems';

/**
 * The organizers' search box, on rumble's `search` argument: trigram similarity over the columns
 * the caller may read, ranked best match first. One query per table, run in parallel.
 */

const RESULT_LIMIT = 10;
const MIN_SEARCH_LENGTH = 2;

/**
 * Registrations (delegation members, single participants, supervisors) and payments reach their
 * conference through the participant row, so they filter by the relation instead of a column.
 */
export function registrationIn(conferenceId: string) {
	return { conference: { id: { eq: conferenceId } } };
}

/** Membership in the conference through any of the four possible roles. */
function participatesIn(conferenceId: string) {
	const inConference = { conferenceId: { eq: conferenceId } };
	const registeredIn = registrationIn(conferenceId);
	return {
		OR: [
			{ delegationMemberships: registeredIn },
			{ singleParticipant: registeredIn },
			{ conferenceSupervisor: registeredIn },
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
	assignedRole: { nationAlpha3Code: string | null; name: string | null } | null;
}) {
	const role = delegation.assignedRole;
	if (role?.nationAlpha3Code)
		return getFullTranslatedCountryNameFromISO3Code(role.nationAlpha3Code);
	return role?.name ?? delegation.id;
}

async function searchSeats({
	conferenceId,
	term
}: {
	conferenceId: string;
	term: string;
}): Promise<SearchSeat[]> {
	const nameLike = { ilike: `%${term}%` };
	const nationCodes = matchingNationCodes(term);
	const heldSeat = [
		...(nationCodes.length > 0
			? [{ assignedRole: { nationAlpha3Code: { in: nationCodes } } }]
			: []),
		{ assignedRole: { OR: [{ name: nameLike }, { abbreviation: nameLike }] } },
		// a past result from the search history comes back as its id
		{ id: { eq: term }, assignedRoleId: { isNotNull: true } }
	];

	const [delegations, singles] = await Promise.all([
		client.query.delegations({
			__args: {
				where: { conferenceId: { eq: conferenceId }, OR: heldSeat },
				limit: RESULT_LIMIT
			},
			id: true,
			assignedRole: { nationAlpha3Code: true, name: true },
			members: { isHeadDelegate: true, user: { id: true }, school: { name: true } }
		}),
		client.query.singleParticipants({
			__args: {
				where: {
					...registrationIn(conferenceId),
					OR: [
						{ assignedRole: { name: nameLike } },
						{ id: { eq: term }, assignedRoleId: { isNotNull: true } }
					]
				},
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
			subtitle: delegationSchoolsLabel(delegation.members),
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

async function searchCommittees({
	conferenceId,
	term
}: {
	conferenceId: string;
	term: string;
}): Promise<SearchCommittee[]> {
	const [committees, agendaItems] = await Promise.all([
		client.query.committees({
			__args: {
				search: { term },
				where: { conferenceId: { eq: conferenceId } },
				limit: RESULT_LIMIT
			},
			id: true,
			name: true,
			abbreviation: true
		}),
		client.query.committeeAgendaItems({
			__args: {
				search: { term },
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

/** Every school, whichever conference knows it: they are shared, and so is their history. */
async function searchSchools(term: string): Promise<SearchSchool[]> {
	const schools = await client.query.schools({
		__args: { search: { term }, limit: RESULT_LIMIT },
		id: true,
		name: true,
		city: true
	});
	return schools.map((school) => ({ id: school.id, name: school.name, city: school.city }));
}

interface SearchResults {
	users: SearchUser[];
	delegations: SearchDelegation[];
	schools: SearchSchool[];
	seats: SearchSeat[];
	committees: SearchCommittee[];
	foreignUsers: SearchForeignUser[];
	transactions: SearchTransaction[];
}

/**
 * One group's results, or none when its query fails: the groups are asked for together, and one
 * failing must not leave the palette without the others.
 */
async function orNone<T>({ group, results }: { group: string; results: Promise<T[]> }) {
	try {
		return await results;
	} catch (error) {
		logger.error('A command palette search failed', { group, error });
		return [];
	}
}

/** The parts a person may hold in one conference, which decide whether they take part in it. */
export function participation(conferenceId: string) {
	const inConference = { conferenceId: { eq: conferenceId } };
	const registeredIn = registrationIn(conferenceId);
	return {
		delegationMemberships: { __args: { where: registeredIn }, id: true },
		singleParticipant: { __args: { where: registeredIn }, id: true },
		conferenceSupervisor: { __args: { where: registeredIn }, id: true },
		teamMember: { __args: { where: inConference }, id: true },
		waitingListEntry: { __args: { where: inConference }, id: true }
	} as const;
}

/**
 * Everything the search box finds in one conference. Schools are asked for only when the caller
 * may open the schools page (`withSchools`), which is where a school result leads.
 */
export async function searchConference({
	conferenceId,
	searchTerm,
	withSchools = false
}: {
	conferenceId: string;
	searchTerm: string;
	withSchools?: boolean;
}): Promise<SearchResults> {
	if (searchTerm.trim().length < MIN_SEARCH_LENGTH) {
		return {
			users: [],
			delegations: [],
			schools: [],
			seats: [],
			committees: [],
			foreignUsers: [],
			transactions: []
		};
	}
	const inConference = { conferenceId: { eq: conferenceId } };

	const term = searchTerm.trim();
	const [users, cardHolders, foreignUsers, delegations, transactions, seats, committees, schools] =
		await Promise.all([
			orNone({
				group: 'users',
				results: client.query.users({
					__args: { search: { term }, where: participatesIn(conferenceId), limit: RESULT_LIMIT },
					id: true,
					givenName: true,
					familyName: true,
					email: true,
					...participation(conferenceId)
				})
			}),
			// The access card of the external ID card, so scanning or typing it finds its owner. Only
			// rows the caller may read come back.
			orNone({
				group: 'cardHolders',
				results: client.query.conferenceParticipants({
					__args: {
						where: { ...inConference, accessCardId: { ilike: `%${term}%` } },
						limit: RESULT_LIMIT
					},
					user: {
						id: true,
						givenName: true,
						familyName: true,
						email: true,
						...participation(conferenceId)
					}
				})
			}),
			orNone({
				group: 'foreignUsers',
				results: client.query.users({
					__args: {
						search: { term },
						where: { NOT: participatesIn(conferenceId) },
						limit: RESULT_LIMIT
					},
					id: true,
					givenName: true,
					familyName: true,
					email: true
				})
			}),
			// Delegations by the schools their members come from, or by id, which is how a past result
			// from the search history comes back. `entryCode` is the delegation's join secret, masked
			// for team members who do not hand it out, and a masked column fails the whole query: it is
			// neither selected nor searched.
			orNone({
				group: 'delegations',
				results: client.query.delegations({
					__args: {
						where: {
							...inConference,
							OR: [{ members: { school: { name: containing(term) } } }, { id: { eq: term } }]
						},
						limit: RESULT_LIMIT
					},
					id: true,
					members: { isHeadDelegate: true, user: { id: true }, school: { name: true } }
				})
			}),
			orNone({
				group: 'transactions',
				results: client.query.paymentTransactions({
					__args: { search: { term }, where: registrationIn(conferenceId), limit: RESULT_LIMIT },
					id: true,
					amount: true,
					recievedAt: true,
					conference: { currency: true }
				})
			}),
			orNone({ group: 'seats', results: searchSeats({ conferenceId, term }) }),
			orNone({ group: 'committees', results: searchCommittees({ conferenceId, term }) }),
			withSchools ? orNone({ group: 'schools', results: searchSchools(term) }) : []
		]);

	return {
		seats,
		committees,
		schools,
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
			school: delegationSchoolsLabel(delegation.members),
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
