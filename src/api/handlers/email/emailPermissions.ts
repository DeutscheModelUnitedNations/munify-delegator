import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

/**
 * The automatic mails are participant care's: they switch them on and off, write their texts and
 * the footer under every mail, and read the log, which names who was written to. The rest of the team sees which mails the
 * conference sends, and in which words.
 */
export function registerEmailAbilities() {
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

	abilityBuilder.emailLog.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.emailLog
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Switching mails, writing their texts, previewing them and counting what they would send is
 * participant care's.
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
