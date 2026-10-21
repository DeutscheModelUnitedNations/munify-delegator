import { db, schema } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	assertAllowedRow,
	assertTeamRole,
	CONFERENCE_CONTENT_ROLES,
	isParticipantOfConference,
	isTeamMemberOfConference,
	offeredIn,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertCanClaimFile } from '$api/handlers/storedFile/storedFilePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

export function registerResolutionAbilities() {
	abilityBuilder.resolution.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everybody with a part in the conference downloads its adopted resolutions: participants,
	// supervisors and the team.
	abilityBuilder.resolution.allow('read').when((ctx) => where(isParticipantOfConference(ctx)));
	abilityBuilder.resolution.allow('read').when((ctx) => where(isTeamMemberOfConference(ctx)));

	// Project management, participant care and the content lead upload and curate them.
	abilityBuilder.resolution
		.allow(['update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, CONFERENCE_CONTENT_ROLES)));
}

/** A committee tag is optional, but one that is given has to be the resolution's conference's. */
async function assertCommitteeInConference(
	committeeId: string | null | undefined,
	conferenceId: string
) {
	if (!(await offeredIn(conferenceId, { committeeId }))) {
		throw apiError('INVALID_INPUT', m.resolutionCommitteeOtherConference());
	}
}

/**
 * Refuses unless the caller curates the conference's resolutions, the committee tag is the
 * conference's, and the caller uploaded the PDF for a resolution of that conference.
 */
export async function assertCanCreateResolution(
	ctx: ApiContext,
	args: { conferenceId: string; committeeId?: string | null; fileId: string }
) {
	await assertTeamRole(ctx, args.conferenceId, CONFERENCE_CONTENT_ROLES);
	await assertCommitteeInConference(args.committeeId, args.conferenceId);
	await assertCanClaimFile(ctx, args.fileId, {
		kind: 'resolution',
		field: 'content',
		conferenceId: args.conferenceId
	});
}

/**
 * Refuses unless the resolution exists, the caller may update it, and a new committee tag is its
 * conference's.
 */
export async function assertCanUpdateResolution(
	ctx: ApiContext,
	id: string,
	committeeId: string | null | undefined
) {
	const resolution = await db.query.resolution
		.findFirst({
			...(await ctx.abilities.resolution.filter('update')).merge({ where: { id } }).query.single,
			columns: { id: true, conferenceId: true }
		})
		.then(assertFindFirstExists);

	await assertCommitteeInConference(committeeId, resolution.conferenceId);
}

/** Refuses unless the resolution exists and the caller may delete it. */
export async function assertCanDeleteResolution(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.resolution,
		(await ctx.abilities.resolution.filter('delete')).merge({ where: { id } }).sql.where
	);
}
