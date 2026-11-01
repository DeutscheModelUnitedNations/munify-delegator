import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import { assertTeamPermission, isCaredForUser, systemAdmin } from '#api/services/authHelper/rules';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/** The abilities of possible duplicate pairs. Nobody deletes one; a scan drops stale open pairs. */
export function registerPossibleDuplicateAbilities() {
	// System admins read and decide every pair.
	abilityBuilder.possibleDuplicate.allow(['read', 'update']).when(systemAdmin);
	// Participant care (project management and participant care) reads and decides a pair when
	// either account is in its care (`isCaredForUser`). How much of the *other* account it reads
	// is a rule on the user table.
	abilityBuilder.possibleDuplicate.allow(['read', 'update']).when((ctx) => {
		const caredFor = isCaredForUser(ctx);
		return caredFor ? { where: { OR: [{ user: caredFor }, { candidate: caredFor }] } } : undefined;
	});
}

/**
 * Refuses (FORBIDDEN) scanning a conference for duplicates unless the caller holds
 * `manageParticipants` (project management and participant care) in it.
 */
export async function assertCanScanPossibleDuplicates({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the pair: participant care of a
 * conference either account takes part in or waits for. Returns the caller's id, who is recorded
 * as having decided it.
 */
export async function assertCanDecidePossibleDuplicate({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	const callerId = ctx.mustBeLoggedIn().sub;
	const pair = await db.query.possibleDuplicate.findFirst({
		...(await ctx.abilities.possibleDuplicate.filter('update')).merge({ where: { id } }).query
			.single,
		columns: { id: true }
	});
	if (!pair) throw apiError({ code: 'NOT_FOUND', message: m.possibleDuplicateNotFound() });
	return { callerId };
}
