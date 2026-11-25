import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	hop,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { partIn } from '#api/handlers/conferenceParticipant/conferenceParticipantPermissions';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertAllowed } from '#api/services/authHelper/utils';

/**
 * Participant care (project management and participant care) reads what the people of its
 * conference agreed to on paper. Writing goes through the mutations below.
 */
export function registerAgreementDetailAbilities() {
	abilityBuilder.agreementDetail.allow('read').when(systemAdmin);
	abilityBuilder.agreementDetail
		.allow('read')
		.when(
			liveWhere((args) =>
				hop(
					isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }),
					(participant) => ({ participant })
				)
			)
		);
}

/**
 * Refuses (NOT_FOUND) unless the caller may update the participant row: `manageParticipants`
 * (project management and participant care) in its conference.
 */
export async function assertCanSetAgreementDetail({
	ctx,
	conferenceParticipantId
}: {
	ctx: ApiContext;
	conferenceParticipantId: string;
}) {
	await assertAllowed({
		ctx,
		table: 'conferenceParticipant',
		action: 'update',
		id: conferenceParticipantId
	});
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference, and answers the user's participant row there (NOT_FOUND for
 * somebody without one).
 */
export async function assertCanRecordPaper({
	ctx,
	conferenceId,
	userId
}: {
	ctx: ApiContext;
	conferenceId: string;
	userId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	return partIn({ conferenceId, userId });
}
