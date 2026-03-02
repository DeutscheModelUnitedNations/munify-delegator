import { builder } from '../builder';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';

const SearchUserResult = builder.simpleObject('SearchUserResult', {
	fields: (t) => ({
		id: t.string(),
		email: t.string(),
		given_name: t.string(),
		family_name: t.string(),
		participationType: t.string()
	})
});

const SearchDelegationResult = builder.simpleObject('SearchDelegationResult', {
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

const SearchConferenceResult = builder.simpleObject('SearchConferenceResult', {
	fields: (t) => ({
		users: t.field({ type: [SearchUserResult] }),
		delegations: t.field({ type: [SearchDelegationResult] })
	})
});

builder.queryFields((t) => ({
	searchConference: t.field({
		type: SearchConferenceResult,
		args: {
			conferenceId: t.arg.string(),
			searchTerm: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			const user = ctx.permissions.getLoggedInUserOrThrow();

			const dbUser = await db.user.findUnique({
				where: {
					id: user.sub,
					teamMember: {
						some: {
							conferenceId: args.conferenceId,
							role: {
								in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
							}
						}
					}
				}
			});

			if (!dbUser && !user.hasRole('admin')) {
				throw new GraphQLError(
					'You are not allowed to search. You need to be a team member with the role PARTICIPANT_CARE or PROJECT_MANAGEMENT or an admin.'
				);
			}

			const searchTerm = args.searchTerm.trim();
			if (searchTerm.length < 2) {
				return { users: [], delegations: [] };
			}

			const limit = 10;

			const [users, delegations] = await Promise.all([
				searchUsers(args.conferenceId, searchTerm, limit),
				searchDelegations(args.conferenceId, searchTerm, limit)
			]);

			return { users, delegations };
		}
	})
}));

async function searchUsers(conferenceId: string, searchTerm: string, limit: number) {
	const containsFilter = { contains: searchTerm, mode: 'insensitive' as const };

	// Find users who are participants in this conference
	const users = await db.user.findMany({
		where: {
			AND: [
				{
					OR: [
						{ given_name: containsFilter },
						{ family_name: containsFilter },
						{ email: containsFilter },
						{ phone: containsFilter },
						{ id: searchTerm }
					]
				},
				{
					OR: [
						{ delegationMemberships: { some: { conferenceId } } },
						{ singleParticipant: { some: { conferenceId } } },
						{ conferenceSupervisor: { some: { conferenceId } } },
						{ teamMember: { some: { conferenceId } } }
					]
				}
			]
		},
		include: {
			delegationMemberships: { where: { conferenceId } },
			singleParticipant: { where: { conferenceId } },
			conferenceSupervisor: { where: { conferenceId } },
			teamMember: { where: { conferenceId } }
		},
		take: limit
	});

	return users.map((u) => {
		let participationType = 'unknown';
		if (u.teamMember.length > 0) participationType = 'team';
		else if (u.conferenceSupervisor.length > 0) participationType = 'supervisor';
		else if (u.delegationMemberships.length > 0) participationType = 'delegation';
		else if (u.singleParticipant.length > 0) participationType = 'single';

		return {
			id: u.id,
			email: u.email,
			given_name: u.given_name,
			family_name: u.family_name,
			participationType
		};
	});
}

async function searchDelegations(conferenceId: string, searchTerm: string, limit: number) {
	const containsFilter = { contains: searchTerm, mode: 'insensitive' as const };

	const delegations = await db.delegation.findMany({
		where: {
			conferenceId,
			OR: [
				{ school: containsFilter },
				{ entryCode: containsFilter },
				{ id: searchTerm },
				{
					members: {
						some: {
							user: {
								OR: [{ given_name: containsFilter }, { family_name: containsFilter }]
							}
						}
					}
				}
			]
		},
		include: {
			members: {
				select: {
					userId: true,
					isHeadDelegate: true
				}
			},
			assignedNonStateActor: {
				select: { name: true }
			}
		},
		take: limit
	});

	return delegations.map((d) => {
		const headDelegate = d.members.find((m) => m.isHeadDelegate);
		return {
			id: d.id,
			school: d.school,
			entryCode: d.entryCode,
			memberCount: d.members.length,
			assignedNationAlpha3Code: d.assignedNationAlpha3Code,
			assignedNonStateActorName: d.assignedNonStateActor?.name ?? null,
			headDelegateUserId: headDelegate?.userId ?? null
		};
	});
}
