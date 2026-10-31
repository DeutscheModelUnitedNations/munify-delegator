import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	CONFERENCE_CONTENT_ROLES,
	isParticipantOfConference,
	isTeamMemberOfConference,
	offeredIn,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerResolutionAbilities() {
	abilityBuilder.resolution.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everybody with a part in the conference downloads its adopted resolutions: participants,
	// supervisors and the team.
	abilityBuilder.resolution.allow('read').when((ctx) => grantWhere(isParticipantOfConference(ctx)));
	abilityBuilder.resolution
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	// Project management, participant care and the content lead upload and curate them.
	abilityBuilder.resolution
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: CONFERENCE_CONTENT_ROLES })));
}

/** A committee tag is optional, but one that is given has to be the resolution's conference's. */
async function assertCommitteeInConference({
	committeeId,
	conferenceId
}: {
	committeeId: string | null | undefined;
	conferenceId: string;
}) {
	if (!(await offeredIn({ conferenceId, ref: { committeeId } }))) {
		throw apiError({ code: 'INVALID_INPUT', message: m.resolutionCommitteeOtherConference() });
	}
}

/**
 * Refuses unless the caller curates the conference's resolutions, the committee tag is the
 * conference's, and the caller uploaded the PDF for a resolution.
 */
export async function assertCanCreateResolution({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { conferenceId: string; committeeId?: string | null; fileId: string };
}) {
	await assertTeamPermission({
		ctx,
		conferenceId: args.conferenceId,
		permission: 'editConferenceContent'
	});
	await assertCommitteeInConference({
		committeeId: args.committeeId,
		conferenceId: args.conferenceId
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
 * Refuses unless the resolution exists, the caller may update it, and a new committee tag is its
 * conference's.
 */
export async function assertCanUpdateResolution({
	ctx,
	id,
	committeeId
}: {
	ctx: ApiContext;
	id: string;
	committeeId: string | null | undefined;
}) {
	const resolution = await db.query.resolution
		.findFirst({
			...(await ctx.abilities.resolution.filter('update')).merge({ where: { id } }).query.single,
			columns: { id: true, conferenceId: true }
		})
		.then(assertFindFirstExists);

	await assertCommitteeInConference({ committeeId, conferenceId: resolution.conferenceId });
}
