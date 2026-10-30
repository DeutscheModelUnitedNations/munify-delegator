import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	hasTeamPermission,
	isTeamMemberOfConference,
	participantIdsOf,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

export function registerPaymentTransactionAbilities() {
	// Ported from abilities/entities/paymentTransaction.ts
	abilityBuilder.paymentTransaction.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Only project management and participant care of the conference, as in the CASL rules.
	abilityBuilder.paymentTransaction
		.allow(['read', 'update'])
		.when((ctx) => grantWhere(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Whoever made a transfer reference sees it: `createPaymentTransaction` hands the new row back to
	// its creator, whose reference is the whole point of the payment pages. The legacy resolver
	// returned it without a read check, so this is what keeps that working through the ability layer.
	abilityBuilder.paymentTransaction.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { payer: { userId: id } } } : undefined;
	});
}

/**
 * Refuses unless the caller may make a payment reference in `conferenceId`, paid by `userId`, for
 * the participants `paymentFor`. The payer has to take part in the conference too. Answers with
 * the participant rows of the payer and of everybody the payment covers (each once).
 */
export async function assertCanCreatePaymentTransaction(
	ctx: ApiContext,
	args: { conferenceId: string; userId: string; paymentFor: readonly string[] }
) {
	const caller = ctx.mustBeLoggedIn().sub;

	// A reference is made by its payer, for people that payer can see in the conference -
	// themselves, their delegation, the participants they supervise and the supervisors they
	// share a student with. Participant care may make one on anybody's behalf.
	if (!(await hasTeamPermission(ctx, args.conferenceId, 'manageParticipants'))) {
		if (args.userId !== caller) {
			throw apiError('FORBIDDEN', m.paymentOnlyOwnName());
		}
		// in this conference: whom the caller knows from another one is no reason to pay for them here
		const paymentFor = [...new Set(args.paymentFor)];
		const own = await db.query.conferenceParticipant.findMany({
			where: {
				conferenceId: args.conferenceId,
				userId: { in: paymentFor },
				OR: [
					{ userId: caller },
					{ delegationMember: { delegation: { members: { participant: { userId: caller } } } } },
					{ supervisors: { participant: { userId: caller } } },
					// a supervisor sharing a student with the caller
					{
						conferenceSupervisor: {
							supervised: { supervisors: { participant: { userId: caller } } }
						}
					}
				]
			},
			columns: { id: true }
		});
		if (own.length !== paymentFor.length) {
			throw apiError('FORBIDDEN', m.paymentOnlyForOwn());
		}
	}
	const payer = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId: args.conferenceId, userId: args.userId },
		columns: { id: true }
	});
	if (!payer) {
		throw apiError('INVALID_INPUT', m.paymentPayerNotParticipant());
	}
	const covered = await participantIdsOf(args.conferenceId, args.paymentFor);
	return {
		payerParticipantId: payer.id,
		coveredParticipantIds: [...covered.values()]
	};
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
