import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isSystemAdmin,
	isTeamMemberOf,
	systemAdmin,
	where
} from '#api/services/authHelper';
import type { Context } from '#api/context';
import { apiError } from '#api/services/errors/apiError';
import { m } from '#lib/paraglide/messages';

/**
 * Schools are shared by every conference. Anybody may read what names one - its name and where it
 * is - so applicants can pick it. The rest (address, contact, the team's notes) belongs to the
 * people who look after the participants: participant care and project management read and edit
 * every school a person taking part in their conference (or waiting for it) names as their own.
 */
const PUBLIC_COLUMNS = {
	id: true,
	createdAt: true,
	updatedAt: true,
	name: true,
	city: true,
	region: true,
	country: true
};

/** Schools named in a conference the caller looks after the participants of. */
function managedSchool(ctx: Context) {
	const conference = isTeamMemberOf(ctx, PARTICIPANT_CARE_ROLES);
	if (!conference) return undefined;
	return {
		OR: [{ waitingListEntries: { conference } }, { participants: { conference } }]
	};
}

export function registerSchoolAbilities() {
	abilityBuilder.school.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.school.allow('read').when(() => ({ columns: PUBLIC_COLUMNS }));
	abilityBuilder.school.allow(['read', 'update']).when((ctx) => where(managedSchool(ctx)));
}

/** Refuses unless the caller may edit every school in `ids` (which includes reading them in full). */
export async function assertCanUpdateSchools(ctx: ApiContext, ids: readonly string[]) {
	const unique = [...new Set(ids)];
	const allowed = await db.query.school.findMany({
		...(await ctx.abilities.school.filter('update')).merge({ where: { id: { in: unique } } }).query
			.many,
		columns: { id: true }
	});
	if (allowed.length !== unique.length) {
		throw apiError('NOT_FOUND', m.schoolNotFound());
	}
}

/**
 * Refuses unless the caller may edit the school. Returns the conferences whose numbers of it they
 * may see: those they look after the participants of, or every one (`undefined`) for an admin.
 * Managing a school is no reason to learn about the conferences of other organizers.
 */
export async function assertCanReadSchoolMetrics(ctx: ApiContext, schoolId: string) {
	await assertCanUpdateSchools(ctx, [schoolId]);
	if (isSystemAdmin(ctx)) return undefined;
	const caredFor = await db.query.conference.findMany({
		where: isTeamMemberOf(ctx, PARTICIPANT_CARE_ROLES),
		columns: { id: true }
	});
	return caredFor.map((conference) => conference.id);
}

/** The schools of a conference, with their numbers, are participant care's. */
export async function assertCanReadConferenceSchools(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}
