import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

/**
 * The automatic mails are participant care's (project management and participant care): they
 * switch them on and off and write their texts and footer, all through mutations checked by
 * `assertCanManageEmails`. The rules here only grant reads.
 */
export function registerEmailAbilities() {
	// The whole team reads which mails the conference sends, and their texts and footers.
	abilityBuilder.conferenceEmailSetting.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailSetting
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	abilityBuilder.conferenceEmailText.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailText
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	abilityBuilder.conferenceEmailFooter.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailFooter
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	// Only participant care reads the log, since it names whom the conference wrote to.
	abilityBuilder.emailLog.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.emailLog
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Refuses unless the caller is participant care (`manageParticipants`) in the conference: switching
 * mails, writing their texts and footer, previewing them and counting what they would send.
 */
export async function assertCanManageEmails({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
