import { db } from '#api/db/db.js';
import { enum_, object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	conferenceParticipantPubsub,
	paymentTransactionPubsub,
	userReferenceInPaymentTransactionPubsub
} from '#api/pubsub.js';
import {
	assertCanCreatePaymentTransaction,
	assertCanUpdatePaymentTransaction,
	registerPaymentTransactionAbilities
} from './paymentTransactionPermissions';
import { applyPaymentStatus, createPaymentTransaction } from './paymentTransactionService';
import { readableById } from '#api/services/authHelper.js';

registerPaymentTransactionAbilities();

const PaymentTransactionRef = object({ table: 'paymentTransaction' });
query({ table: 'paymentTransaction' });
const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

schemaBuilder.mutationFields((t) => ({
	createPaymentTransaction: t.drizzleField({
		type: PaymentTransactionRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			/** The participants this payment covers; the amount is the fee times their number. */
			paymentFor: t.arg.idList({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			ctx.mustBeLoggedIn();
			const conference = await db.query.conference
				.findFirst({ where: { id: args.conferenceId } })
				.then(assertFindFirstExists);
			const { payerParticipantId, coveredParticipantIds } = await assertCanCreatePaymentTransaction(
				ctx,
				args
			);

			const id = await createPaymentTransaction(
				conference,
				payerParticipantId,
				coveredParticipantIds
			);

			paymentTransactionPubsub.created();
			userReferenceInPaymentTransactionPubsub.created();

			return db.query.paymentTransaction
				.findFirst(query(await readableById(ctx.abilities.paymentTransaction, id)))
				.then(assertFindFirstExists);
		}
	}),

	updatePaymentTransaction: t.drizzleField({
		type: PaymentTransactionRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedStatus: t.arg({ type: administrativeStatusEnum, required: true }),
			recievedAt: t.arg({ type: 'DateTime' })
		},
		resolve: async (query, _root, args, ctx) => {
			const transaction = await assertCanUpdatePaymentTransaction(ctx, args.id);

			await applyPaymentStatus(transaction, args.assignedStatus, args.recievedAt);

			paymentTransactionPubsub.updated(args.id);
			conferenceParticipantPubsub.updated();

			return db.query.paymentTransaction
				.findFirst(query(await readableById(ctx.abilities.paymentTransaction, args.id)))
				.then(assertFindFirstExists);
		}
	})
}));
