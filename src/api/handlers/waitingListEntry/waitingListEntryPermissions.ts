import { db, schema } from '#api/db/db.js';
import { apiError } from '#api/services/errors/apiError.js';
import { m } from '#lib/paraglide/messages.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	assertAllowedRow,
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	where
} from '#api/services/authHelper.js';

export function registerWaitingListEntryAbilities() {
	// Ported from abilities/entities/waitingListEntry.ts
	abilityBuilder.waitingListEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own entry, and change or withdraw it until they are given a seat. Whether it
	// is hidden or assigned is participant care's (`assertCanSetWaitingListFlags`).
	abilityBuilder.waitingListEntry.allow('read').when((ctx) => where(isOwnUser(ctx)));
	abilityBuilder.waitingListEntry.allow(['update', 'delete']).when((ctx) => {
		const own = isOwnUser(ctx);
		return own ? { where: { ...own, assigned: false } } : undefined;
	});

	// Participant care and project management manage their conference's waiting list.
	abilityBuilder.waitingListEntry
		.allow(['read', 'update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/**
 * The entry if the caller may update it (the row's update ability), as a where-clause: an update
 * the caller may not make changes nothing, and the mutation answers with the entry as it is.
 */
export async function updatableWaitingListEntry(ctx: ApiContext, id: string) {
	return (await ctx.abilities.waitingListEntry.filter('update')).merge({ where: { id } }).sql.where;
}

/**
 * Refuses unless the caller may hide the entry or record a seat for it, which is participant
 * care's alone: the entrant edits their own texts and school, never these.
 */
export async function assertCanSetWaitingListFlags(
	ctx: ApiContext,
	id: string,
	args: { hidden?: boolean | null; assigned?: boolean | null }
) {
	if (args.hidden == null && args.assigned == null) return;
	const entry = await db.query.waitingListEntry.findFirst({
		where: { id },
		columns: { conferenceId: true }
	});
	if (!entry) throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	await assertTeamRole(ctx, entry.conferenceId, PARTICIPANT_CARE_ROLES);
}

/** Refuses unless the caller may delete the entry (the row's delete ability). */
export async function assertCanDeleteWaitingListEntry(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.waitingListEntry,
		(await ctx.abilities.waitingListEntry.filter('delete')).merge({ where: { id } }).sql.where
	);
}
