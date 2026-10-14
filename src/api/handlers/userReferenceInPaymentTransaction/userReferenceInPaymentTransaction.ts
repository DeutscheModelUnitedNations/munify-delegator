import { object, query } from '$api/rumble';
import { registerUserReferenceInPaymentTransactionAbilities } from './userReferenceInPaymentTransactionPermissions';

registerUserReferenceInPaymentTransactionAbilities();

object({
	table: 'userReferenceInPaymentTransaction'
});
query({ table: 'userReferenceInPaymentTransaction' });
