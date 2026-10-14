import { db, schema } from '$api/db/db';
import { eq } from 'drizzle-orm';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/errors/apiError';

type AdministrativeStatus = (typeof schema.administrativeStatus.enumValues)[number];

/**
 * Payment reference ids are printed on transfer forms, so they avoid characters that are easy to
 * misread and are grouped in fours. Same alphabet and shape as the legacy generator.
 */
function generateSEPASafeId() {
	const chars = 'ACDEFHJKMNPRTUVWXY3479';
	const length = 16;
	let id = '';
	for (let i = 0; i < length; i++) {
		id += chars[Math.floor(Math.random() * chars.length)];
		if (i % 4 === 3 && i !== length - 1) {
			id += '-';
		}
	}
	return id;
}

/**
 * Records a payment reference paid by `userId` for the participants `paymentFor`, at the
 * conference's fee per participant. Returns the new reference's id.
 */
export async function createPaymentTransaction(
	conference: { id: string; feeAmount: number | null },
	userId: string,
	paymentFor: readonly string[]
) {
	// Captured in a const so the narrowing survives into the transaction closure below,
	// rather than reaching for a non-null assertion there.
	const feeAmount = conference.feeAmount;
	if (!feeAmount) {
		throw apiError('INVALID_INPUT', m.paymentFeeNotSet());
	}

	// The id is caller-generated rather than a nanoid, so retry until it is free.
	let id = generateSEPASafeId();
	for (let attempt = 0; attempt < 10_000; attempt++) {
		const clash = await db.query.paymentTransaction.findFirst({ where: { id } });
		if (!clash) break;
		if (attempt === 9_999) {
			throw apiError('INVALID_INPUT', m.paymentIdGenerationFailed());
		}
		id = generateSEPASafeId();
	}

	await db.transaction(async (tx) => {
		await tx.insert(schema.paymentTransaction).values({
			id,
			amount: paymentFor.length * feeAmount,
			conferenceId: conference.id,
			userId
		});
		if (paymentFor.length > 0) {
			await tx
				.insert(schema.userReferenceInPaymentTransaction)
				.values(paymentFor.map((userId) => ({ paymentTransactionId: id, userId })));
		}
	});

	return id;
}

/**
 * Sets the status of a payment transaction: marks it received when it is `DONE`, and carries the
 * status over to everybody it covers.
 */
export async function applyPaymentStatus(
	transaction: { id: string; conferenceId: string; paymentFor: { userId: string }[] },
	assignedStatus: AdministrativeStatus,
	recievedAt: Date | null | undefined
) {
	await db.transaction(async (tx) => {
		if (assignedStatus === 'DONE') {
			await tx
				.update(schema.paymentTransaction)
				.set({ recievedAt: recievedAt ?? undefined })
				.where(eq(schema.paymentTransaction.id, transaction.id));
		}

		// The payment status is carried over to every participant the transaction covers,
		// creating their status row if it does not exist yet.
		for (const reference of transaction.paymentFor) {
			await tx
				.insert(schema.conferenceParticipantStatus)
				.values({
					userId: reference.userId,
					conferenceId: transaction.conferenceId,
					paymentStatus: assignedStatus
				})
				.onConflictDoUpdate({
					target: [
						schema.conferenceParticipantStatus.userId,
						schema.conferenceParticipantStatus.conferenceId
					],
					set: { paymentStatus: assignedStatus }
				});
		}
	});
}
