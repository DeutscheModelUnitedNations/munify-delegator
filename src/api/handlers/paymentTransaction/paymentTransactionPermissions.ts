import { db } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertParticipantsOf,
	hasTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

export function registerPaymentTransactionAbilities() {
	// Ported from abilities/entities/paymentTransaction.ts
	abilityBuilder.paymentTransaction.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Only project management and participant care of the conference, as in the CASL rules.
	abilityBuilder.paymentTransaction
		.allow(['read', 'update'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Whoever made a transfer reference sees it: `createPaymentTransaction` hands the new row back to
	// its creator, whose reference is the whole point of the payment pages. The legacy resolver
	// returned it without a read check, so this is what keeps that working through the ability layer.
	abilityBuilder.paymentTransaction.allow('read').when((ctx) => where(isOwnUser(ctx)));
}

/**
 * Refuses unless the caller may make a payment reference in `conferenceId`, paid by `userId`, for
 * the participants `paymentFor`.
 */
export async function assertCanCreatePaymentTransaction(
	ctx: ApiContext,
	args: { conferenceId: string; userId: string; paymentFor: readonly string[] }
) {
	const caller = ctx.mustBeLoggedIn().sub;

	// A reference is made by its payer, for people that payer can see in the conference -
	// themselves, their delegation, the participants they supervise. Participant care may
	// make one on anybody's behalf.
	if (!(await hasTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES))) {
		if (args.userId !== caller) {
			throw apiError('FORBIDDEN', m.paymentOnlyOwnName());
		}
		const visible = await db.query.user.findMany({
			...(await ctx.abilities.user.filter('read')).merge({
				where: { id: { in: [...new Set(args.paymentFor)] } }
			}).query.many,
			columns: { id: true }
		});
		if (visible.length !== new Set(args.paymentFor).size) {
			throw apiError('FORBIDDEN', m.paymentOnlyForOwn());
		}
	}
	await assertParticipantsOf(args.conferenceId, args.paymentFor);
}

/** The payment transaction `id` with whom it covers, if the caller may update it; an error otherwise. */
export async function assertCanUpdatePaymentTransaction(ctx: ApiContext, id: string) {
	const updatable = (await ctx.abilities.paymentTransaction.filter('update')).merge({
		where: { id }
	});

	return db.query.paymentTransaction
		.findFirst({ ...updatable.query.single, with: { paymentFor: true } })
		.then(assertFindFirstExists);
}
