import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	CONFERENCE_CONTENT_ROLES,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { linkConfig } from '#api/handlers/chaseLink/linkAuth';

const NOT_FROM_CHASE = { chasePaperId: { isNull: true } } as const;

/**
 * While a CHASE link is active, a resolution it adopted is the link's: deleting it would only bring
 * it back with the next sync. Without a link (ending it also clears the column, `syncLinkRow`)
 * it is an ordinary one.
 */
function deletableResolutions() {
	return linkConfig() ? NOT_FROM_CHASE : {};
}

/** The abilities of adopted resolutions. */
export function registerResolutionAbilities() {
	abilityBuilder.resolution.allow(['read', 'update']).when(systemAdmin);
	abilityBuilder.resolution
		.allow('delete')
		.when((ctx) => (systemAdmin(ctx) ? { where: deletableResolutions() } : undefined));

	// Everybody with a part in the conference reads (downloads) its adopted resolutions: its
	// participants (delegates, single participants, supervisors) and its whole team.
	abilityBuilder.resolution.allow('read').when(liveWhere(isParticipantOfConference));
	abilityBuilder.resolution.allow('read').when(liveWhere(isTeamMemberOfConference));

	// The content roles (project management, participant care, content lead) update and delete
	// them; creating is `assertCanCreateResolution`.
	abilityBuilder.resolution
		.allow('update')
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: CONFERENCE_CONTENT_ROLES }))
		);
	abilityBuilder.resolution.allow('delete').when(
		liveWhere((args) => {
			const team = isTeamMemberOfConference({ ...args, roles: CONFERENCE_CONTENT_ROLES });
			return team && { ...team, ...deletableResolutions() };
		})
	);
}

/**
 * Refuses unless the caller holds `editConferenceContent` (project management, participant care,
 * content lead) in the conference (FORBIDDEN) and uploaded the PDF as a resolution of that
 * conference (INVALID_INPUT, `assertCanClaimFile`). The committee tag being the conference's is the
 * database's check (`resolution_same_conference`).
 */
export async function assertCanCreateResolution({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { conferenceId: string; fileId: string };
}) {
	await assertTeamPermission({
		ctx,
		conferenceId: args.conferenceId,
		permission: 'editConferenceContent'
	});
	await assertCanClaimFile({
		ctx,
		fileId: args.fileId,
		target: {
			kind: 'resolution',
			field: 'content',
			conferenceId: args.conferenceId
		}
	});
}

/**
 * Refuses unless the resolution exists and the caller may update it (the update ability: project
 * management, participant care, content lead, a system admin; NOT_FOUND otherwise).
 */
export async function assertCanUpdateResolution({ ctx, id }: { ctx: ApiContext; id: string }) {
	await db.query.resolution
		.findFirst({
			...(await ctx.abilities.resolution.filter('update')).merge({ where: { id } }).query.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}
