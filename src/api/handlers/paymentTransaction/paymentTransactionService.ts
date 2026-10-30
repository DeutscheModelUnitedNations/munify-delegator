import { type Transaction, db, schema } from '#api/db/db';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';

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
 * Refuses a reference that involves somebody whose fee is already paid: once paid, a person
 * makes no new references and is covered by nobody else's. Locks their status rows, so a payment
 * marked received at the same moment cannot slip past.
 */
async function assertNobodyPaid(tx: Transaction, participantIds: readonly string[]) {
	const paid = await tx
		.select({ id: schema.conferenceParticipant.id })
		.from(schema.conferenceParticipant)
		.where(
			whereRows(schema.conferenceParticipant, {
				id: { in: [...new Set(participantIds)] },
				paymentStatus: 'DONE'
			})
		)
		.for('update');
	if (paid.length > 0) {
		throw apiError('CONFLICT', m.paymentAlreadyPaid());
	}
}

/**
 * Records a payment reference paid by the participant `payerParticipantId` for the participants
 * `paymentFor` (participant row ids), at the conference's fee per participant. Returns the new
 * reference's id. Nobody involved may have paid already (`assertNobodyPaid`).
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
		await assertNobodyPaid(tx, [payerParticipantId, ...paymentFor]);
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
				.where(whereRows(schema.paymentTransaction, { id: transaction.id }));
		}

		// The payment status is carried over to every participant the transaction covers.
		const covered = transaction.paymentFor.map((reference) => reference.conferenceParticipantId);
		if (covered.length > 0) {
			await tx
				.update(schema.conferenceParticipant)
				.set({ paymentStatus: assignedStatus })
				.where(whereRows(schema.conferenceParticipant, { id: { in: covered } }));
		}
	});
}
