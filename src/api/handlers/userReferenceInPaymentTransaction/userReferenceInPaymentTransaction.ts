import { object } from '#api/rumble';
import { registerUserReferenceInPaymentTransactionAbilities } from './userReferenceInPaymentTransactionPermissions';

registerUserReferenceInPaymentTransactionAbilities();

object({
	table: 'userReferenceInPaymentTransaction'
});
