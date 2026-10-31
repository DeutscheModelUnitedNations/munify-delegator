import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isSystemAdmin,
	isTeamMemberOf,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import type { Context } from '#api/context';
import { apiError } from '#api/services/errors';
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
	const conference = isTeamMemberOf({ ctx, roles: PARTICIPANT_CARE_ROLES });
	if (!conference) return undefined;
	return {
		OR: [{ waitingListEntries: { conference } }, { participants: { conference } }]
	};
}

export function registerSchoolAbilities() {
	abilityBuilder.school.allow(['read', 'update', 'delete']).when(systemAdmin);
	abilityBuilder.school.allow('read').when(() => ({ columns: PUBLIC_COLUMNS }));
	abilityBuilder.school.allow(['read', 'update']).when((ctx) => grantWhere(managedSchool(ctx)));
}

/** Refuses unless the caller may edit every school in `ids` (which includes reading them in full). */
export async function assertCanUpdateSchools({
	ctx,
	ids
}: {
	ctx: ApiContext;
	ids: readonly string[];
}) {
	const unique = [...new Set(ids)];
	const allowed = await db.query.school.findMany({
		...(await ctx.abilities.school.filter('update')).merge({ where: { id: { in: unique } } }).query
			.many,
		columns: { id: true }
	});
	if (allowed.length !== unique.length) {
		throw apiError({ code: 'NOT_FOUND', message: m.schoolNotFound() });
	}
}

/**
 * Refuses unless the caller may edit the school. Returns the conferences whose numbers of it they
 * may see: those they look after the participants of, or every one (`undefined`) for an admin.
 * Managing a school is no reason to learn about the conferences of other organizers.
 */
export async function assertCanReadSchoolMetrics({
	ctx,
	schoolId
}: {
	ctx: ApiContext;
	schoolId: string;
}) {
	await assertCanUpdateSchools({ ctx, ids: [schoolId] });
	if (isSystemAdmin(ctx)) return undefined;
	const caredFor = await db.query.conference.findMany({
		where: isTeamMemberOf({ ctx, roles: PARTICIPANT_CARE_ROLES }),
		columns: { id: true }
	});
	return caredFor.map((conference) => conference.id);
}

/** The schools of a conference, with their numbers, are participant care's. */
export async function assertCanReadConferenceSchools({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
