import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanCreatePaymentTransaction,
	assertCanUpdatePaymentTransaction,
	registerPaymentTransactionAbilities
} from './paymentTransactionPermissions';
import { applyPaymentStatus, createPaymentTransaction } from './paymentTransactionService';

registerPaymentTransactionAbilities();

const PaymentTransactionRef = object({ table: 'paymentTransaction' });
query({ table: 'paymentTransaction' });
const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

schemaBuilder.mutationFields((t) => ({
	createPaymentTransaction: t.drizzleField({
		description:
			"Creates a payment reference for the participants it covers, at the conference's fee per participant. Refused when one of them has paid already.",
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
				{ ctx, args }
			);

			const id = await createPaymentTransaction({
				conference,
				payerParticipantId,
				paymentFor: coveredParticipantIds
			});

			return db.query.paymentTransaction
				.findFirst(
					query(
						(await ctx.abilities.paymentTransaction.filter('read')).merge({ where: { id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updatePaymentTransaction: t.drizzleField({
		description:
			"Sets a payment's status and carries it over to everybody the payment covers; `DONE` also records when the money arrived.",
		type: PaymentTransactionRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedStatus: t.arg({ type: administrativeStatusEnum, required: true }),
			recievedAt: t.arg({ type: 'DateTime' })
		},
		resolve: async (query, _root, args, ctx) => {
			const payment = await assertCanUpdatePaymentTransaction({ ctx, id: args.id });

			await applyPaymentStatus({
				payment,
				assignedStatus: args.assignedStatus,
				recievedAt: args.recievedAt
			});

			return db.query.paymentTransaction
				.findFirst(
					query(
						(await ctx.abilities.paymentTransaction.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
