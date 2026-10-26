import { db } from '#api/db/db.js';
import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '#api/services/authHelper.js';
import { assertCanClaimFile } from '#api/handlers/storedFile/storedFilePermissions.js';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerPlaceAbilities() {
	// Ported from abilities/entities/place.ts
	abilityBuilder.place.allow('read');
	abilityBuilder.place.allow(['update', 'delete']).when(systemAdmin);

	abilityBuilder.place
		.allow(['update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/** Refuses unless the caller may add places to the conference and store the site plan given. */
export async function assertCanCreatePlace(
	ctx: ApiContext,
	conferenceId: string,
	sitePlanFileId: string | null | undefined
) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	await assertCanClaimFile(ctx, sitePlanFileId, {
		kind: 'place',
		field: 'sitePlan',
		conferenceId
	});
}

/** Refuses unless the caller may update the place and store the site plan given in it. */
export async function assertCanUpdatePlace(
	ctx: ApiContext,
	id: string,
	sitePlanFileId: string | null | undefined
) {
	const place = await db.query.place
		.findFirst({
			...(await ctx.abilities.place.filter('update')).merge({ where: { id } }).query.single,
			columns: { conferenceId: true }
		})
		.then(assertFindFirstExists);
	await assertCanClaimFile(ctx, sitePlanFileId, {
		kind: 'place',
		field: 'sitePlan',
		conferenceId: place.conferenceId
	});
}

/** The place `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletablePlaceWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.place.filter('delete')).merge({ where: { id } }).sql.where;
}
