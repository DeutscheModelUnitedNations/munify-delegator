import { db } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isManagedUser,
	systemAdmin
} from '$api/services/authHelper';
import type { Context } from '$api/context';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

export function registerPossibleDuplicateAbilities() {
	// Whoever looks after one of the two accounts sees the pair and decides on it. Who may read the
	// *other* account, and how much of it, is a rule on the user table (`userPermissions.ts`).
	abilityBuilder.possibleDuplicate.allow(['read', 'update']).when(systemAdmin);
	abilityBuilder.possibleDuplicate.allow(['read', 'update']).when((ctx) => {
		const managed = isManagedUser(ctx);
		return managed ? { where: { OR: [{ user: managed }, { candidate: managed }] } } : undefined;
	});
}

/** Scanning a conference for duplicates is participant care's. */
export async function assertCanScanPossibleDuplicates(ctx: Context, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/** Refuses unless the caller may decide the pair; returns its two accounts. */
export async function assertCanDecidePossibleDuplicate(ctx: ApiContext, id: string) {
	const pair = await db.query.possibleDuplicate.findFirst({
		...(await ctx.abilities.possibleDuplicate.filter('update')).merge({ where: { id } }).query
			.single,
		columns: { userId: true, candidateId: true }
	});
	if (!pair) throw apiError('NOT_FOUND', m.possibleDuplicateNotFound());
	return pair;
}
