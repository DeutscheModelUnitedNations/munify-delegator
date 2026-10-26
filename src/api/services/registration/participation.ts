import { db } from '#api/db/db.js';
import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { apiError } from '#api/services/errors/apiError.js';

/**
 * Finds how a user already takes part in a conference - as supervisor, single participant,
 * delegation member or team member - and optionally refuses when any of those exist. Registration
 * handlers use it for the state checks that abilities cannot express: "may this person register
 * at all", rather than "may they touch this row". A waiting list entry is not a participation:
 * it is how someone gets one.
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
	const participant = { participant: { conferenceId, userId } };

	const [foundSupervisor, foundSingleParticipant, foundDelegationMember, foundTeamMember] =
		await Promise.all([
			db.query.conferenceSupervisor.findFirst({ where: participant }),
			db.query.singleParticipant.findFirst({ where: participant }),
			db.query.delegationMember.findFirst({ where: participant }),
			db.query.teamMember.findFirst({ where: { conferenceId, userId } })
		]);

	if (throwIfAnyIsFound) {
		if (foundSupervisor) {
			throw apiError('CONFLICT', m.youAreAlreadySupervisor({}, { locale: getLocale() }));
		}
		if (foundSingleParticipant) {
			throw apiError('CONFLICT', m.youAreAlreadySingleParticipant({}, { locale: getLocale() }));
		}
		if (foundDelegationMember) {
			throw apiError('CONFLICT', m.youAreAlreadyDelegationMember({}, { locale: getLocale() }));
		}
		if (foundTeamMember) {
			throw apiError('CONFLICT', m.youAreAlreadyTeamMember({}, { locale: getLocale() }));
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
