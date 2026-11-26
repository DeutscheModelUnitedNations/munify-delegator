import { abilityBuilder } from '#api/rumble';
import { idIn, ownParticipantIds, systemAdmin } from '#api/services/authHelper/rules';
import { careOfThePayment } from '../paymentTransaction/paymentTransactionPermissions';
import { liveWhere } from '#api/services/authHelper/callerFacts';

/** The abilities of the rows saying whom a payment covers. */
export function registerUserReferenceInPaymentTransactionAbilities() {
	// Who a payment covers. Written only by `createPaymentTransaction`, never on its own, so besides
	// the system admin every rule here is a read.
	abilityBuilder.userReferenceInPaymentTransaction
		.allow(['read', 'update', 'delete'])
		.when(systemAdmin);

	// Participant care (project management and participant care) reads whom its conference's
	// payments cover (a payment's conference is its payer's).
	abilityBuilder.userReferenceInPaymentTransaction.allow('read').when(careOfThePayment());

	// The payer reads whom they paid for, and everybody reads the references that cover them.
	abilityBuilder.userReferenceInPaymentTransaction.allow('read').when(
		liveWhere((args) => {
			const ids = ownParticipantIds(args);
			if (!ids) return undefined;
			const own = idIn(ids);
			return {
				OR: [{ paymentTransaction: { payerParticipantId: own } }, { conferenceParticipantId: own }]
			};
		})
	);
}
