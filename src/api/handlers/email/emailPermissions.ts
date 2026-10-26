import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '#api/services/authHelper.js';

/**
 * The automatic mails are participant care's: they switch them on and off, write their texts and
 * the footer under every mail, and read the log, which names who was written to. The rest of the team sees which mails the
 * conference sends, and in which words.
 */
export function registerEmailAbilities() {
	abilityBuilder.conferenceEmailSetting.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailSetting
		.allow('read')
		.when((ctx) => where(isTeamMemberOfConference(ctx)));

	abilityBuilder.conferenceEmailText.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailText
		.allow('read')
		.when((ctx) => where(isTeamMemberOfConference(ctx)));

	abilityBuilder.conferenceEmailFooter.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.conferenceEmailFooter
		.allow('read')
		.when((ctx) => where(isTeamMemberOfConference(ctx)));

	abilityBuilder.emailLog.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.emailLog
		.allow('read')
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/**
 * Switching mails, writing their texts, previewing them and counting what they would send is
 * participant care's.
 */
export async function assertCanManageEmails(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
