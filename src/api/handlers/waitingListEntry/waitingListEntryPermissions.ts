import { db } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	isOwnUser,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

export function registerWaitingListEntryAbilities() {
	// Ported from abilities/entities/waitingListEntry.ts
	abilityBuilder.waitingListEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own entry, and change or withdraw it until they are given a seat. Whether it
	// is hidden or seated is participant care's (`assertCanSetWaitingListFlags`).
	abilityBuilder.waitingListEntry.allow('read').when((ctx) => grantWhere(isOwnUser(ctx)));
	abilityBuilder.waitingListEntry.allow(['update', 'delete']).when((ctx) => {
		const own = isOwnUser(ctx);
		return own ? { where: { ...own, assignedAt: { isNull: true } } } : undefined;
	});

	// Participant care and project management manage their conference's waiting list.
	abilityBuilder.waitingListEntry
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Refuses unless the caller may hide the entry or record a seat for it, which is participant
 * care's alone: the entrant edits their own texts and school, never these.
 */
export async function assertCanSetWaitingListFlags({
	ctx,
	id,
	args
}: {
	ctx: ApiContext;
	id: string;
	args: { hidden?: boolean | null; assigned?: boolean | null };
}) {
	if (args.hidden == null && args.assigned == null) return;
	const entry = await db.query.waitingListEntry.findFirst({
		where: { id, conference: teamConference({ ctx, permission: 'manageParticipants' }) },
		columns: { id: true }
	});
	if (!entry) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
}
