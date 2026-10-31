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
import { apiError } from '#api/services/errors';

/** The abilities of payment references. Nobody but a system admin deletes one. */
export function registerPaymentTransactionAbilities() {
	abilityBuilder.paymentTransaction.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) reads and updates the payments of
	// its conference.
	abilityBuilder.paymentTransaction
		.allow(['read', 'update'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));

	// The payer reads their own payments: `createPaymentTransaction` hands the new row back to them,
	// and its transfer reference is the whole point of the payment pages.
	abilityBuilder.paymentTransaction.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { payer: { userId: id } } } : undefined;
	});
}

/**
 * Refuses unless the caller may make a payment in `conferenceId`, paid by `userId`, for the users
 * `paymentFor`: whoever holds `manageParticipants` (project management and participant care) for
 * anybody, everybody else only in their own name (FORBIDDEN otherwise) and for people they know in
 * the conference (themselves, their delegation, the participants they supervise, the supervisors
 * they share a student with; FORBIDDEN otherwise). The payer has to have a participant row in the
 * conference and everybody covered a registration there (INVALID_INPUT otherwise). Returns their
 * participant row ids.
 */
export async function assertCanCreatePaymentTransaction({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: { conferenceId: string; userId: string; paymentFor: readonly string[] };
}) {
	const caller = ctx.mustBeLoggedIn().sub;

	if (
		!(await hasTeamPermission({
			ctx,
			conferenceId: args.conferenceId,
			permission: 'manageParticipants'
		}))
	) {
		if (args.userId !== caller) {
			throw apiError({ code: 'FORBIDDEN', message: m.paymentOnlyOwnName() });
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
			throw apiError({ code: 'FORBIDDEN', message: m.paymentOnlyForOwn() });
		}
	}
	const payer = await db.query.conferenceParticipant.findFirst({
		where: { conferenceId: args.conferenceId, userId: args.userId },
		columns: { id: true }
	});
	if (!payer) {
		throw apiError({ code: 'INVALID_INPUT', message: m.paymentPayerNotParticipant() });
	}
	const covered = await participantIdsOf({
		conferenceId: args.conferenceId,
		userIds: args.paymentFor
	});
	return {
		payerParticipantId: payer.id,
		coveredParticipantIds: [...covered.values()]
	};
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the payment: participant care
 * (project management and participant care) of its conference. Returns it with whom it covers.
 */
export async function assertCanUpdatePaymentTransaction({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	const updatable = (await ctx.abilities.paymentTransaction.filter('update')).merge({
		where: { id }
	});

	return db.query.paymentTransaction
		.findFirst({ ...updatable.query.single, with: { paymentFor: true } })
		.then(assertFindFirstExists);
}
