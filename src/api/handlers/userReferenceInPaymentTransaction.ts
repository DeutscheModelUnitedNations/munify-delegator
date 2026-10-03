import { abilityBuilder, object, query } from '$api/rumble';
import {
	isTeamMemberOf,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId
} from '$api/services/authHelper';

/**
 * Who a payment covers. Written only by `createPaymentTransaction`, never edited on its own, so
 * the rules here are reads (and the admin wildcard).
 */
abilityBuilder.userReferenceInPaymentTransaction
	.allow(['read', 'update', 'delete'])
	.when(systemAdmin);

// Participant care sees who the conference's payments cover.
abilityBuilder.userReferenceInPaymentTransaction.allow('read').when((ctx) => {
	const conference = isTeamMemberOf(ctx, PARTICIPANT_CARE_ROLES);
	return conference ? { where: { paymentTransaction: { conference } } } : undefined;
});

// The payer sees whom they paid for, and everybody sees the payments that cover them.
abilityBuilder.userReferenceInPaymentTransaction.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? { where: { OR: [{ paymentTransaction: { user: { id } } }, { user: { id } }] } }
		: undefined;
});

object({
	table: 'userReferenceInPaymentTransaction'
});
query({ table: 'userReferenceInPaymentTransaction' });
