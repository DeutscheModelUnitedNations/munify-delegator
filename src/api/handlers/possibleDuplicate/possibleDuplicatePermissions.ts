import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import { assertTeamPermission, isCaredForUser, systemAdmin } from '#api/services/authHelper/rules';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerPossibleDuplicateAbilities() {
	// System admins read and decide every pair.
	abilityBuilder.possibleDuplicate.allow(['read', 'update']).when(systemAdmin);
	// Participant care reads and decides a pair when either account is in its care
	// (`isCaredForUser`). How much of the *other* account it reads is a rule on the user table.
	abilityBuilder.possibleDuplicate.allow(['read', 'update']).when((ctx) => {
		const caredFor = isCaredForUser(ctx);
		return caredFor ? { where: { OR: [{ user: caredFor }, { candidate: caredFor }] } } : undefined;
	});
}

/** Refuses scanning a conference for duplicates unless the caller holds `manageParticipants` in it. */
export async function assertCanScanPossibleDuplicates({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/** Refuses unless the caller may decide the pair (its update ability). */
export async function assertCanDecidePossibleDuplicate({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	const pair = await db.query.possibleDuplicate.findFirst({
		...(await ctx.abilities.possibleDuplicate.filter('update')).merge({ where: { id } }).query
			.single,
		columns: { id: true }
	});
	if (!pair) throw apiError({ code: 'NOT_FOUND', message: m.possibleDuplicateNotFound() });
}
