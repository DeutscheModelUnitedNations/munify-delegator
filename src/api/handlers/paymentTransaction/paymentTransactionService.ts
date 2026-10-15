import { db, schema } from '$api/db/db';
import { eq, inArray } from 'drizzle-orm';
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
 * Records a payment reference paid by the participant `payerParticipantId` for the participants
 * `paymentFor` (participant row ids), at the conference's fee per participant. Returns the new
 * reference's id.
 */
export async function createPaymentTransaction(
	conference: { feeAmount: number | null },
	payerParticipantId: string,
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
			payerParticipantId
		});
		if (paymentFor.length > 0) {
			await tx.insert(schema.userReferenceInPaymentTransaction).values(
				paymentFor.map((conferenceParticipantId) => ({
					paymentTransactionId: id,
					conferenceParticipantId
				}))
			);
		}
	});

	return id;
}

/**
 * Sets the status of a payment transaction: marks it received when it is `DONE`, and carries the
 * status over to everybody it covers.
 */
export async function applyPaymentStatus(
	transaction: { id: string; paymentFor: { conferenceParticipantId: string }[] },
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

		// The payment status is carried over to every participant the transaction covers.
		const covered = transaction.paymentFor.map((reference) => reference.conferenceParticipantId);
		if (covered.length > 0) {
			await tx
				.update(schema.conferenceParticipant)
				.set({ paymentStatus: assignedStatus })
				.where(inArray(schema.conferenceParticipant.id, covered));
		}
	});
}
