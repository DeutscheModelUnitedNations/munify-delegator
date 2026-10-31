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
	// Places belong to the schedule: readable by whoever reads the conference's calendar.
	abilityBuilder.place.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { conference } } : undefined;
	});
	abilityBuilder.place.allow(['update', 'delete']).when(systemAdmin);

	abilityBuilder.place
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/** Refuses unless the caller may add places to the conference and store the site plan given. */
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

/** Refuses unless the caller may update the place and store the site plan given in it. */
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
