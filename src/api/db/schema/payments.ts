import {
	snakeCase,
	text,
	timestamp,
	doublePrecision,
	index,
	integer,
	pgEnum,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { defaultIdAndTimestamps, defaultTimestamps, trigramIndex } from './helpers';
import { participantRef } from './participants';

/** Payments and whom they cover. */

export const paymentTransaction = snakeCase.table(
	'payment_transaction',
	{
		id: text().primaryKey(),
		amount: doublePrecision().notNull(),
		...defaultTimestamps,
		recievedAt: timestamp({ precision: 3 }),
		/**
		 * When the payer said they transferred the money (`reportPaymentTransfer`): their own word, which
		 * changes no payment status. `null` while they have not, or took it back.
		 */
		transferReportedAt: timestamp({ precision: 3 }),
		/**
		 * When the payer gave the reference up to start over (`discardPaymentTransaction`). It stays,
		 * so participant care can still match a transfer made with it, but is no longer offered.
		 */
		discardedAt: timestamp({ precision: 3 }),
		/** Who pays: a participant of the conference the payment is for. */
		payerParticipantId: participantRef()
	},
	(table) => [
		trigramIndex({ name: 'payment_transaction_id_trgm', column: table.id }),
		index('payment_transaction_payer_participant_id_idx').using(
			'btree',
			table.payerParticipantId.asc().nullsLast()
		)
	]
);

export const userReferenceInPaymentTransaction = snakeCase.table(
	'user_reference_in_payment_transaction',
	{
		...defaultIdAndTimestamps,
		paymentTransactionId: text()
			.notNull()
			.references(() => paymentTransaction.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
		/** Whom the payment covers. */
		conferenceParticipantId: participantRef('cascade')
	},
	(table) => [
		index('user_reference_in_payment_transaction_payment_transaction_id_idx').using(
			'btree',
			table.paymentTransactionId.asc().nullsLast()
		),
		index('user_reference_in_payment_transaction_conference_participant_id_idx').using(
			'btree',
			table.conferenceParticipantId.asc().nullsLast()
		)
	]
);

/** What the bank payment sync made of a transfer naming a payment. */
export const bankTransferResult = pgEnum('bank_transfer_result', [
	/** The amount fit and the payment was open: marked received. */
	'RECEIVED',
	/** The amount did not fit the payments the transfer names: flagged for review. */
	'AMOUNT_MISMATCH',
	/** The payment had been received before: flagged for review (paid twice?). */
	'ALREADY_RECEIVED'
]);

/**
 * A bank transfer the bank payment sync (`delegator-jobs bank-payment-sync`) found a payment
 * reference in, one row per payment it names. Keeps the sync from handling a transfer twice and
 * shows the team which transfer settled or flagged a payment.
 */
export const bankTransfer = snakeCase.table(
	'bank_transfer',
	{
		...defaultIdAndTimestamps,
		/** The transaction's id in BuchhaltungsButler (`id_by_customer`). */
		externalId: integer().notNull(),
		paymentTransactionId: text()
			.notNull()
			.references(() => paymentTransaction.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		/** The whole transfer's amount, which may cover several payments. */
		amount: doublePrecision().notNull(),
		bookedAt: timestamp({ precision: 3 }).notNull(),
		/**
		 * Who sent the money, as the bank names them (BuchhaltungsButler's `to_from`): often a school's
		 * Förderverein or a parent, nobody with an account here. Null for transfers recorded before.
		 */
		counterparty: text(),
		/** The transfer's Verwendungszweck, as the bank gave it. Null for transfers recorded before. */
		purpose: text(),
		result: bankTransferResult().notNull()
	},
	(table) => [
		uniqueIndex('bank_transfer_external_id_payment_transaction_id_key').using(
			'btree',
			table.externalId.asc().nullsLast(),
			table.paymentTransactionId.asc().nullsLast()
		),
		index('bank_transfer_payment_transaction_id_idx').using(
			'btree',
			table.paymentTransactionId.asc().nullsLast()
		)
	]
);
