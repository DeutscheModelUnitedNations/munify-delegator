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
	// System admins read, update and delete every entry.
	abilityBuilder.waitingListEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Entrants read their own entry, and update or withdraw it until they are given a seat; hiding
	// or seating it is participant care's alone (`assertCanSetWaitingListFlags`).
	abilityBuilder.waitingListEntry.allow('read').when((ctx) => grantWhere(isOwnUser(ctx)));
	abilityBuilder.waitingListEntry.allow(['update', 'delete']).when((ctx) => {
		const own = isOwnUser(ctx);
		return own ? { where: { ...own, assignedAt: { isNull: true } } } : undefined;
	});

	// Participant care (project management and participant care) reads, updates and deletes the
	// entries of its conference.
	abilityBuilder.waitingListEntry
		.allow(['read', 'update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Refuses (NOT_FOUND) setting `hidden` or `assigned` unless the caller holds `manageParticipants` in
 * the entry's conference: the entrant edits their own texts and school, never these. Passes when
 * neither is set.
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
