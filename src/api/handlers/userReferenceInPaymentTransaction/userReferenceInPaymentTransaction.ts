import { object } from '#api/rumble.js';
import { registerUserReferenceInPaymentTransactionAbilities } from './userReferenceInPaymentTransactionPermissions';

registerUserReferenceInPaymentTransactionAbilities();

object({
	table: 'userReferenceInPaymentTransaction'
});
