import { db } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOf,
	systemAdmin,
	where
} from '$api/services/authHelper';
import type { Context } from '$api/context';
import { apiError } from '$api/services/errors/apiError';
import { m } from '#lib/paraglide/messages.js';

/**
 * Schools are shared by every conference. Anybody may read what names one - its name and where it
 * is - so applicants can pick it. The rest (address, contact, the team's notes) belongs to the
 * people who look after the participants: participant care and project management read and edit
 * every school an application, a participant, supervisor or waiting list entry of their conference
 * names.
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
		OR: [
			{ delegations: { conference } },
			{ singleParticipants: { conference } },
			{ conferenceSupervisors: { conference } },
			{ waitingListEntries: { conference } },
			{ participants: { conference } }
		]
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

/** The schools of a conference, with their numbers, are participant care's. */
export async function assertCanReadConferenceSchools(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
