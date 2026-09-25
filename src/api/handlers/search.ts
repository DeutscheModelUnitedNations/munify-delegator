import { db } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertMayManageConference,
	userId
} from '$api/services/authHelper';

/**
 * The organizers' search box: one query that looks through a conference's participants,
 * delegations and payment transactions, plus users who are not in the conference yet so they can
 * be invited.
 */

const SearchUserResult = schemaBuilder.simpleObject('SearchUserResult', {
	fields: (t) => ({
		id: t.string(),
		email: t.string(),
		givenName: t.string(),
		familyName: t.string(),
		participationType: t.string()
	})
});

const SearchDelegationResult = schemaBuilder.simpleObject('SearchDelegationResult', {
	fields: (t) => ({
		id: t.string(),
		school: t.string({ nullable: true }),
		entryCode: t.string(),
		memberCount: t.int(),
		assignedNationAlpha3Code: t.string({ nullable: true }),
		assignedNonStateActorName: t.string({ nullable: true }),
		headDelegateUserId: t.string({ nullable: true })
	})
});

const SearchForeignUserResult = schemaBuilder.simpleObject('SearchForeignUserResult', {
	fields: (t) => ({
		id: t.string(),
		email: t.string(),
		givenName: t.string(),
		familyName: t.string()
	})
});

const SearchTransactionResult = schemaBuilder.simpleObject('SearchTransactionResult', {
	fields: (t) => ({
		id: t.string(),
		amount: t.float(),
		currency: t.string(),
		recievedAt: t.string({ nullable: true })
	})
});

const SearchConferenceResult = schemaBuilder.simpleObject('SearchConferenceResult', {
	fields: (t) => ({
		users: t.field({ type: [SearchUserResult] }),
		delegations: t.field({ type: [SearchDelegationResult] }),
		foreignUsers: t.field({ type: [SearchForeignUserResult] }),
		transactions: t.field({ type: [SearchTransactionResult] })
	})
});

const RESULT_LIMIT = 10;

/** A single word matched against every field a person might be looked up by. */
function nameMatches(word: string) {
	const pattern = `%${word}%`;
	return {
		OR: [
			{ givenName: { ilike: pattern } },
			{ familyName: { ilike: pattern } },
			{ email: { ilike: pattern } },
			{ phone: { ilike: pattern } }
		]
	};
}

/**
 * Multi-word searches require every word to match somewhere, so "anna schmidt" does not match
 * everyone called Anna. A single word additionally matches an exact user id, which is what the
 * support links paste in.
 */
function userSearchFilter(searchTerm: string, words: string[]) {
	if (words.length > 1) {
		return { AND: words.map(nameMatches) };
	}
	return { OR: [...nameMatches(searchTerm).OR, { id: searchTerm }] };
}

/** Membership in the conference through any of the four possible roles. */
function participatesIn(conferenceId: string) {
	return {
		OR: [
			{ delegationMemberships: { conferenceId } },
			{ singleParticipant: { conferenceId } },
			{ conferenceSupervisor: { conferenceId } },
			{ teamMember: { conferenceId } }
		]
	};
}

async function searchUsers(conferenceId: string, searchTerm: string, words: string[]) {
	const inConference = { conferenceId };
	const users = await db.query.user.findMany({
		where: { AND: [userSearchFilter(searchTerm, words), participatesIn(conferenceId)] },
		with: {
			delegationMemberships: { where: inConference },
			singleParticipant: { where: inConference },
			conferenceSupervisor: { where: inConference },
			teamMember: { where: inConference }
		},
		limit: RESULT_LIMIT
	});

	return users.map((user) => {
		let participationType = 'unknown';
		if (user.teamMember.length > 0) participationType = 'team';
		else if (user.conferenceSupervisor.length > 0) participationType = 'supervisor';
		else if (user.delegationMemberships.length > 0) participationType = 'delegation';
		else if (user.singleParticipant.length > 0) participationType = 'single';

		return {
			id: user.id,
			email: user.email,
			givenName: user.givenName,
			familyName: user.familyName,
			participationType
		};
	});
}

async function searchDelegations(conferenceId: string, searchTerm: string, words: string[]) {
	const pattern = `%${searchTerm}%`;

	const memberNameFilter =
		words.length > 1
			? {
					AND: words.map((word) => ({
						members: {
							user: {
								OR: [{ givenName: { ilike: `%${word}%` } }, { familyName: { ilike: `%${word}%` } }]
							}
						}
					}))
				}
			: {
					members: {
						user: {
							OR: [{ givenName: { ilike: pattern } }, { familyName: { ilike: pattern } }]
						}
					}
				};

	const delegations = await db.query.delegation.findMany({
		where: {
			conferenceId,
			OR: [
				{ school: { ilike: pattern } },
				{ entryCode: { ilike: pattern } },
				{ id: searchTerm },
				memberNameFilter
			]
		},
		with: {
			members: { columns: { userId: true, isHeadDelegate: true } },
			assignedNonStateActor: { columns: { name: true } }
		},
		limit: RESULT_LIMIT
	});

	return delegations.map((delegation) => ({
		id: delegation.id,
		school: delegation.school,
		entryCode: delegation.entryCode,
		memberCount: delegation.members.length,
		assignedNationAlpha3Code: delegation.assignedNationAlpha3Code,
		assignedNonStateActorName: delegation.assignedNonStateActor?.name ?? null,
		headDelegateUserId: delegation.members.find((member) => member.isHeadDelegate)?.userId ?? null
	}));
}

async function searchTransactions(conferenceId: string, searchTerm: string) {
	const transactions = await db.query.paymentTransaction.findMany({
		where: { conferenceId, id: { ilike: `%${searchTerm}%` } },
		orderBy: { createdAt: 'desc' },
		with: { conference: { columns: { currency: true } } },
		limit: RESULT_LIMIT
	});

	return transactions.map((transaction) => ({
		id: transaction.id,
		amount: transaction.amount,
		currency: transaction.conference.currency ?? 'EUR',
		recievedAt: transaction.recievedAt ? transaction.recievedAt.toISOString() : null
	}));
}

async function searchForeignUsers(
	conferenceId: string,
	searchTerm: string,
	words: string[],
	excludeUserIds: string[]
) {
	const foreignUsers = await db.query.user.findMany({
		where: {
			...userSearchFilter(searchTerm, words),
			// An empty `notIn` would compile to invalid SQL, so it is only added when it applies.
			...(excludeUserIds.length > 0 ? { id: { notIn: excludeUserIds } } : {}),
			NOT: participatesIn(conferenceId)
		},
		limit: RESULT_LIMIT
	});

	return foreignUsers.map((user) => ({
		id: user.id,
		email: user.email,
		givenName: user.givenName,
		familyName: user.familyName
	}));
}

schemaBuilder.queryFields((t) => ({
	searchConference: t.field({
		type: SearchConferenceResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			searchTerm: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertMayManageConference(args.conferenceId, userId(ctx), PARTICIPANT_CARE_ROLES, {
				allowSystemAdmin: true,
				ctx
			});

			const searchTerm = args.searchTerm.trim();
			if (searchTerm.length < 2) {
				return { users: [], delegations: [], foreignUsers: [], transactions: [] };
			}
			const words = searchTerm.split(/\s+/).filter((word) => word.length > 0);

			const [users, delegations, transactions] = await Promise.all([
				searchUsers(args.conferenceId, searchTerm, words),
				searchDelegations(args.conferenceId, searchTerm, words),
				searchTransactions(args.conferenceId, searchTerm)
			]);

			const foreignUsers = await searchForeignUsers(
				args.conferenceId,
				searchTerm,
				words,
				users.map((user) => user.id)
			);

			return { users, delegations, foreignUsers, transactions };
		}
	})
}));
