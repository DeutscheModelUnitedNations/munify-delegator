import { abilityBuilder } from '#api/rumble';
import {
	isTeamMemberOf,
	PARTICIPANT_CARE_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';

/** The abilities of the rows saying whom a payment covers. */
export function registerUserReferenceInPaymentTransactionAbilities() {
	// Who a payment covers. Written only by `createPaymentTransaction`, never on its own, so besides
	// the system admin every rule here is a read.
	abilityBuilder.userReferenceInPaymentTransaction
		.allow(['read', 'update', 'delete'])
		.when(systemAdmin);

	// Participant care (project management and participant care) reads whom its conference's
	// payments cover.
	abilityBuilder.userReferenceInPaymentTransaction.allow('read').when((ctx) => {
		const conference = isTeamMemberOf({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return conference ? { where: { paymentTransaction: { conference } } } : undefined;
	});

	// The payer reads whom they paid for, and everybody reads the references that cover them.
	abilityBuilder.userReferenceInPaymentTransaction.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						OR: [{ paymentTransaction: { payer: { userId: id } } }, { participant: { userId: id } }]
					}
				}
			: undefined;
	});
}
