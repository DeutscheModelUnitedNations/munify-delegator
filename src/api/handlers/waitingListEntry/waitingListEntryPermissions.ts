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

	// Everyone reads their own entry, and updates or withdraws it until they are given a seat;
	// hiding it is participant care's alone (`assertCanUpdateWaitingListEntry`).
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
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the entry - their own until they
 * are given a seat, or `manageParticipants` (project management and participant care) in its
 * conference - and, when the update sets `hidden`, unless the caller holds `manageParticipants`:
 * the entrant edits their own texts and school, never that.
 */
export async function assertCanUpdateWaitingListEntry({
	ctx,
	id,
	hidden
}: {
	ctx: ApiContext;
	id: string;
	hidden: boolean | null | undefined;
}) {
	const entry =
		hidden == null
			? await db.query.waitingListEntry.findFirst({
					...(await ctx.abilities.waitingListEntry.filter('update')).merge({ where: { id } }).query
						.single,
					columns: { id: true }
				})
			: await db.query.waitingListEntry.findFirst({
					where: { id, conference: teamConference({ ctx, permission: 'manageParticipants' }) },
					columns: { id: true }
				});
	if (!entry) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
}
