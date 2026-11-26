/**
 * Fixtures for the bank transfer spec (e2e/payment/bank-transfer-review.spec.ts).
 *
 * A conference of its own with two payments the bank payment sync flagged because their transfers
 * paid too little: one the spec only looks at, one for two people it decides (one of them paid).
 * Every run puts that state back.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_BANK_CONFERENCE_ID = 'e2e00000conference0000022';
export const E2E_BANK_CARE_ID = 'e2e-bank-care';
export const E2E_BANK_PAYER_ID = 'e2e-bank-payer';
/** A reference as the app prints them. */
export const E2E_BANK_REFERENCE = 'CDEF-HJKM-NPRT-UVWX';
/** The payment the spec decides: two people, a transfer for one of them. */
export const E2E_BANK_DECIDE_REFERENCE = 'DEFH-JKMN-PRTU-VWXY';
const E2E_BANK_DECIDE_PAYER_ID = 'e2e-bank-decide-payer';
const E2E_BANK_DECIDE_OTHER_ID = 'e2e-bank-decide-other';

export async function seedBankTransfers(db: NodePgDatabase) {
	await upsertConference(db, {
		id: E2E_BANK_CONFERENCE_ID,
		title: 'E2E Bank Transfer Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await upsertUsers(
		db,
		[E2E_BANK_CARE_ID, E2E_BANK_PAYER_ID, E2E_BANK_DECIDE_PAYER_ID, E2E_BANK_DECIDE_OTHER_ID].map(
			(id) => ({
				...makeSeedUser(),
				...COMPLETE_PROFILE,
				id
			})
		)
	);
	await upsertTeamMember(db, E2E_BANK_CONFERENCE_ID, E2E_BANK_CARE_ID, 'PARTICIPANT_CARE');
	const payerParticipantId = await upsertParticipant(db, E2E_BANK_CONFERENCE_ID, E2E_BANK_PAYER_ID);
	await flaggedPayment(db, {
		id: E2E_BANK_REFERENCE,
		participantIds: [payerParticipantId],
		externalId: 4711,
		transferred: 42.5
	});

	const decidePayerId = await upsertParticipant(
		db,
		E2E_BANK_CONFERENCE_ID,
		E2E_BANK_DECIDE_PAYER_ID
	);
	const decideOtherId = await upsertParticipant(
		db,
		E2E_BANK_CONFERENCE_ID,
		E2E_BANK_DECIDE_OTHER_ID
	);
	await flaggedPayment(db, {
		id: E2E_BANK_DECIDE_REFERENCE,
		participantIds: [decidePayerId, decideOtherId],
		externalId: 4712,
		transferred: 85
	});
}

/**
 * A payment for these people (the first pays) at 85 each, flagged for review by a transfer of
 * `transferred`: everybody on `NEEDS_HUMAN_REVIEW`, nothing received.
 */
async function flaggedPayment(
	db: NodePgDatabase,
	{
		id,
		participantIds,
		externalId,
		transferred
	}: { id: string; participantIds: string[]; externalId: number; transferred: number }
) {
	await db
		.update(schema.conferenceParticipant)
		.set({ paymentStatus: 'NEEDS_HUMAN_REVIEW' })
		.where(inArray(schema.conferenceParticipant.id, participantIds));

	const payment = {
		id,
		amount: 85 * participantIds.length,
		payerParticipantId: participantIds[0],
		recievedAt: null
	};
	await db
		.insert(schema.paymentTransaction)
		.values(payment)
		.onConflictDoUpdate({ target: schema.paymentTransaction.id, set: payment });
	await db
		.delete(schema.userReferenceInPaymentTransaction)
		.where(eq(schema.userReferenceInPaymentTransaction.paymentTransactionId, id));
	await db.insert(schema.userReferenceInPaymentTransaction).values(
		participantIds.map((conferenceParticipantId) => ({
			paymentTransactionId: id,
			conferenceParticipantId
		}))
	);
	await db.delete(schema.bankTransfer).where(eq(schema.bankTransfer.paymentTransactionId, id));
	await db.insert(schema.bankTransfer).values({
		externalId,
		paymentTransactionId: id,
		amount: transferred,
		bookedAt: new Date('2026-11-20T00:00:00Z'),
		counterparty: 'Förderverein E2E e. V.',
		purpose: `Teilnahmebeitrag ${id}`,
		result: 'AMOUNT_MISMATCH'
	});
}
