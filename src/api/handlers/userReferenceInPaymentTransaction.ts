import { abilityBuilder, object, query } from '$api/rumble';
import { systemAdmin } from '$api/services/authHelper';

/**
 * This table had no CASL ability module of its own - it was only reachable through
 * PaymentTransaction, and only system admins had a rule covering it via `can('manage', 'all')`.
 * Keeping it that way rather than inventing a broader rule.
 */
abilityBuilder.userReferenceInPaymentTransaction
	.allow(['read', 'update', 'delete'])
	.when(systemAdmin);

export const UserReferenceInPaymentTransactionRef = object({
	table: 'userReferenceInPaymentTransaction'
});
query({ table: 'userReferenceInPaymentTransaction' });
