import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	GUIDE_ROLES,
	hop,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';

/**
 * A conference's guide sidebar is its guide team's (`editGuide`: project management, content
 * lead). Participants read what it shows through `myGuide`, never the table.
 */
export function registerGuideOutlineAbilities() {
	abilityBuilder.guideOutline.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.guideOutline
		.allow(['read', 'update'])
		.when(liveWhere((args) => isTeamMemberOfConference({ ...args, roles: GUIDE_ROLES })));

	abilityBuilder.guideOutlineVersion.allow('read').when(systemAdmin);
	abilityBuilder.guideOutlineVersion.allow('read').when(
		liveWhere((args) =>
			hop(isTeamMemberOfConference({ ...args, roles: GUIDE_ROLES }), (guideOutline) => ({
				guideOutline
			}))
		)
	);
}

/** Refuses (FORBIDDEN) unless the caller holds `editGuide` in the conference. */
export async function assertCanEditGuideOutline({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'editGuide' });
}
