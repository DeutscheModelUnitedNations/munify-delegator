import { abilityBuilder } from '#api/rumble';
import { systemAdmin } from '#api/services/authHelper/rules';
import { careOfThePayment } from '../paymentTransaction/paymentTransactionPermissions';

/**
 * The abilities of the bank transfers the bank payment sync matched to payments. Written only by
 * the sync, so besides the system admin every rule here is a read.
 */
export function registerBankTransferAbilities() {
	abilityBuilder.bankTransfer.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care reads the transfers of its conference's payments.
	abilityBuilder.bankTransfer.allow('read').when(careOfThePayment());
}
