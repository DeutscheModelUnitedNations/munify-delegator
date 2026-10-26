import { schema } from '#api/db/db.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	assertAllowedRow,
	isOwnUser,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	where
} from '#api/services/authHelper.js';

export function registerWaitingListEntryAbilities() {
	// Ported from abilities/entities/waitingListEntry.ts
	abilityBuilder.waitingListEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own entry.
	abilityBuilder.waitingListEntry.allow('read').when((ctx) => where(isOwnUser(ctx)));

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

/** Refuses unless the caller may delete the entry (the row's delete ability). */
export async function assertCanDeleteWaitingListEntry(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.waitingListEntry,
		(await ctx.abilities.waitingListEntry.filter('delete')).merge({ where: { id } }).sql.where
	);
}
