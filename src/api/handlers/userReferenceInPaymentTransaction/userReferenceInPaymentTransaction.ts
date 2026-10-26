import { object, query } from '#api/rumble.js';
import { registerUserReferenceInPaymentTransactionAbilities } from './userReferenceInPaymentTransactionPermissions';

registerUserReferenceInPaymentTransactionAbilities();

object({
	table: 'userReferenceInPaymentTransaction'
});
query({ table: 'userReferenceInPaymentTransaction' });
