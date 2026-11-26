/**
 * Fixtures for the bank transfer spec (e2e/payment/bank-transfer-review.spec.ts).
 *
 * A conference of its own whose one payment the bank payment sync flagged: its transfer paid too
 * little, so the participant it covers needs review. Every run puts that state back.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
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

export async function seedBankTransfers(db: NodePgDatabase) {
	await upsertConference(db, {
		id: E2E_BANK_CONFERENCE_ID,
		title: 'E2E Bank Transfer Conference',
		state: 'PREPARATION',
		nations: {}
	});
	await upsertUsers(
		db,
		[E2E_BANK_CARE_ID, E2E_BANK_PAYER_ID].map((id) => ({
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id
		}))
	);
	await upsertTeamMember(db, E2E_BANK_CONFERENCE_ID, E2E_BANK_CARE_ID, 'PARTICIPANT_CARE');
	const payerParticipantId = await upsertParticipant(db, E2E_BANK_CONFERENCE_ID, E2E_BANK_PAYER_ID);
	await db
		.update(schema.conferenceParticipant)
		.set({ paymentStatus: 'NEEDS_HUMAN_REVIEW' })
		.where(eq(schema.conferenceParticipant.id, payerParticipantId));

	const payment = { id: E2E_BANK_REFERENCE, amount: 85, payerParticipantId, recievedAt: null };
	await db
		.insert(schema.paymentTransaction)
		.values(payment)
		.onConflictDoUpdate({ target: schema.paymentTransaction.id, set: payment });
	await db
		.delete(schema.userReferenceInPaymentTransaction)
		.where(eq(schema.userReferenceInPaymentTransaction.paymentTransactionId, E2E_BANK_REFERENCE));
	await db.insert(schema.userReferenceInPaymentTransaction).values({
		paymentTransactionId: E2E_BANK_REFERENCE,
		conferenceParticipantId: payerParticipantId
	});
	await db
		.delete(schema.bankTransfer)
		.where(eq(schema.bankTransfer.paymentTransactionId, E2E_BANK_REFERENCE));
	await db.insert(schema.bankTransfer).values({
		externalId: 4711,
		paymentTransactionId: E2E_BANK_REFERENCE,
		amount: 42.5,
		bookedAt: new Date('2026-11-20T00:00:00Z'),
		result: 'AMOUNT_MISMATCH'
	});
}
