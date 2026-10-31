import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import { calendarConference } from '#api/handlers/calendarDay/calendarDayPermissions';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerPlaceAbilities() {
	// Whoever reads the conference's schedule (`calendarConference`) reads its places.
	abilityBuilder.place.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { conference } } : undefined;
	});
	abilityBuilder.place.allow(['update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) updates and deletes them.
	abilityBuilder.place
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference and uploaded the site plan given (`assertCanClaimFile`).
 */
export async function assertCanCreatePlace({
	ctx,
	conferenceId,
	sitePlanFileId
}: {
	ctx: ApiContext;
	conferenceId: string;
	sitePlanFileId: string | null | undefined;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	await assertCanClaimFile({
		ctx,
		fileId: sitePlanFileId,
		target: { kind: 'place', field: 'sitePlan', conferenceId }
	});
}

/**
 * Refuses unless the caller may update the place (participant care of its conference) and uploaded
 * the site plan given (`assertCanClaimFile`).
 */
export async function assertCanUpdatePlace({
	ctx,
	id,
	sitePlanFileId
}: {
	ctx: ApiContext;
	id: string;
	sitePlanFileId: string | null | undefined;
}) {
	const place = await db.query.place
		.findFirst({
			...(await ctx.abilities.place.filter('update')).merge({ where: { id } }).query.single,
			columns: { conferenceId: true }
		})
		.then(assertFindFirstExists);
	await assertCanClaimFile({
		ctx,
		fileId: sitePlanFileId,
		target: {
			kind: 'place',
			field: 'sitePlan',
			conferenceId: place.conferenceId
		}
	});
}
