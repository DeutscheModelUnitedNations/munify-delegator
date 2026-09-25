import { db } from '$api/db/db';
import { m } from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { GraphQLError } from 'graphql';

/**
 * Drizzle port of `fetchUserParticipations.ts`.
 *
 * Finds how a user already takes part in a conference - as supervisor, single participant,
 * delegation member or team member - and optionally refuses when any of those exist. Registration
 * handlers use it for the state checks that abilities cannot express: "may this person register
 * at all", rather than "may they touch this row".
 *
 * The Prisma original stays in place until the legacy resolvers are deleted in Phase F.
 */
export async function fetchUserParticipations({
	conferenceId,
	userId,
	throwIfAnyIsFound = false
}: {
	conferenceId: string;
	userId: string;
	throwIfAnyIsFound?: boolean;
}) {
	const where = { conferenceId, userId };

	const [foundSupervisor, foundSingleParticipant, foundDelegationMember, foundTeamMember] =
		await Promise.all([
			db.query.conferenceSupervisor.findFirst({ where }),
			db.query.singleParticipant.findFirst({ where }),
			db.query.delegationMember.findFirst({ where }),
			db.query.teamMember.findFirst({ where })
		]);

	if (throwIfAnyIsFound) {
		if (foundSupervisor) {
			throw new GraphQLError(m.youAreAlreadySupervisor({}, { locale: getLocale() }));
		}
		if (foundSingleParticipant) {
			throw new GraphQLError(m.youAreAlreadySingleParticipant({}, { locale: getLocale() }));
		}
		if (foundDelegationMember) {
			throw new GraphQLError(m.youAreAlreadyDelegationMember({}, { locale: getLocale() }));
		}
		if (foundTeamMember) {
			throw new GraphQLError(m.youAreAlreadyTeamMember({}, { locale: getLocale() }));
		}
	}

	return { foundSupervisor, foundSingleParticipant, foundDelegationMember, foundTeamMember };
}

export async function isUserAlreadyRegistered(params: { conferenceId: string; userId: string }) {
	const { foundDelegationMember, foundSingleParticipant, foundTeamMember, foundSupervisor } =
		await fetchUserParticipations(params);

	return Boolean(
		foundDelegationMember || foundSingleParticipant || foundTeamMember || foundSupervisor
	);
}
