import { snakeCase, text, timestamp, doublePrecision, index } from 'drizzle-orm/pg-core';
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
