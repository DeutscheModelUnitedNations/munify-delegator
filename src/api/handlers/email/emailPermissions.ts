import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertCanUpdateParticipantStatus } from '#api/handlers/conferenceParticipant/conferenceParticipantPermissions';

/**
 * The automatic mails are participant care's (project management and participant care): they
 * switch them on and off and write their texts and footer, all through mutations checked by
 * `assertCanManageEmails`. The rules here only grant reads.
 */
export function registerEmailAbilities() {
	// Every team member reads which mails the conference sends, and their texts and footers.
	abilityBuilder.conferenceEmailSetting.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailSetting.allow('read').when(liveWhere(isTeamMemberOfConference));

	abilityBuilder.conferenceEmailText.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailText.allow('read').when(liveWhere(isTeamMemberOfConference));

	abilityBuilder.conferenceEmailFooter.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailFooter.allow('read').when(liveWhere(isTeamMemberOfConference));

	// Participant care (project management and participant care) reads the log; nobody else does,
	// since it names whom the conference wrote to.
	abilityBuilder.emailLog.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.emailLog
		.allow('read')
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }))
		);
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference: switching mails, writing their texts and footer, previewing,
 * counting, sending and skipping them. Returns the caller's id, who is logged as the sender of a
 * mail sent by hand and to whom a preview is addressed.
 */
export async function assertCanManageEmails({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	return { callerId: ctx.mustBeLoggedIn().sub };
}

/**
 * Refuses (NOT_FOUND) unless the caller may update the participant row (participant care of its
 * conference, `assertCanUpdateParticipantStatus`), whose person is told their lost badge was
 * found. Returns the caller's id, who is logged as the sender.
 */
export async function assertCanNotifyBadgeFound({
	ctx,
	participantId
}: {
	ctx: ApiContext;
	participantId: string;
}) {
	await assertCanUpdateParticipantStatus({ ctx, id: participantId });
	return { callerId: ctx.mustBeLoggedIn().sub };
}
