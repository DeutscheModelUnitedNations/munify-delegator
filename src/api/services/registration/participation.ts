import { db } from '#api/db/db.js';
import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import { apiError } from '#api/services/errors/apiError.js';

/**
 * Finds how a user is already in a conference - as participant (supervisor, single participant,
 * delegation member) or as team member - and optionally refuses when any of those exist. Registration
 * handlers use it for the state checks that abilities cannot express: "may this person register
 * at all", rather than "may they touch this row". A waiting list entry is not a participation:
 * it is how someone gets one.
 */
export async function fetchParticipationsAndTeamMembership({
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

/** Whether the user is a participant of the conference or on its team. */
export async function isParticipantOrTeamMember(params: { conferenceId: string; userId: string }) {
	const { foundDelegationMember, foundSingleParticipant, foundTeamMember, foundSupervisor } =
		await fetchParticipationsAndTeamMembership(params);

	return Boolean(
		foundDelegationMember || foundSingleParticipant || foundTeamMember || foundSupervisor
	);
}
