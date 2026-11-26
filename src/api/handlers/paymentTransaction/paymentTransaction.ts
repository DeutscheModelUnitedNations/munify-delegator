import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanActAsPayer,
	assertCanCreatePaymentTransaction,
	assertCanUpdatePaymentTransaction,
	registerPaymentTransactionAbilities
} from './paymentTransactionPermissions';
import {
	applyPaymentStatus,
	createPaymentTransaction,
	discardPaymentTransaction,
	paymentForSchema,
	receivePaymentFor,
	reportPaymentTransfer
} from './paymentTransactionService';
import { mcpTool } from '#api/mcp/mcpTool';

registerPaymentTransactionAbilities();

// a payment is looked up by its id, the reference transfers carry
const PaymentTransactionRef = object({
	table: 'paymentTransaction',
	search: { columns: ['id'] }
});
query({ table: 'paymentTransaction' });
const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

schemaBuilder.mutationFields((t) => ({
	createPaymentTransaction: t.drizzleField({
		description:
			"Creates a payment reference paid by `userId` for the participants it covers, at the conference's fee per participant, or answers the one the payer already has for exactly these participants and this amount while its money has not arrived. Participant care makes one for anybody; everybody else only in their own name (FORBIDDEN otherwise) and for people they know in the conference: themselves, their delegation, the participants they supervise and the supervisors they share a student with. INVALID_INPUT when somebody named takes no part in the conference or the conference has no fee, CONFLICT when one of them has paid already.",
		type: PaymentTransactionRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({
				required: true,
				description: 'The payer: the user transferring the money.'
			}),
			paymentFor: t.arg
				.idList({
					required: true,
					description:
						'The users this payment covers, at least one; the amount is the fee times their number.'
				})
				.validate(paymentForSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const { payerParticipantId, coveredParticipantIds } = await assertCanCreatePaymentTransaction(
				{ ctx, args }
			);

			const id = await createPaymentTransaction({
				conferenceId: args.conferenceId,
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
		// Settles the payers' payment status, which the payment mails follow from.
		extensions: mcpTool({ outward: true }),
		description:
			"Sets a payment's status and carries it over to everybody the payment covers. Participant care only; NOT_FOUND for a payment the caller may not update.",
		type: PaymentTransactionRef,
		args: {
			id: t.arg.id({ required: true }),
			assignedStatus: t.arg({
				type: administrativeStatusEnum,
				required: true,
				description: 'The status everybody the payment covers gets.'
			}),
			recievedAt: t.arg({
				type: 'DateTime',
				description:
					'When the money arrived, stored with `DONE` only; left out keeps what is stored.'
			})
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
	}),

	receivePaymentFor: t.drizzleField({
		// Settles the payers' payment status, which the payment mails follow from.
		extensions: mcpTool({ outward: true }),
		description:
			"Marks only some of the people a payment covers paid, as when a transfer brought less than the payment's amount: `paidFor` become DONE, everybody else the payment covers PENDING, to pay with a new reference. Naming everybody is `updatePaymentTransaction` with DONE. Participant care only; NOT_FOUND for a payment the caller may not update, INVALID_INPUT for an empty selection or somebody the payment does not cover.",
		type: PaymentTransactionRef,
		args: {
			id: t.arg.id({ required: true }),
			paidFor: t.arg.idList({
				required: true,
				description: 'The participant rows (`conferenceParticipant` ids) whose fee arrived.'
			}),
			recievedAt: t.arg({
				type: 'DateTime',
				description:
					'When the money arrived, stored only when `paidFor` is everybody; left out keeps what is stored.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			const payment = await assertCanUpdatePaymentTransaction({ ctx, id: args.id });

			await receivePaymentFor({ payment, paidFor: args.paidFor, recievedAt: args.recievedAt });

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
	}),

	reportPaymentTransfer: t.drizzleField({
		description:
			"The payer says they transferred the money (`reported: true`, kept as `transferReportedAt`) or takes that back (`false`). Only their word: nobody's payment status changes. FORBIDDEN for an AI assistant and while impersonating, NOT_FOUND for a payment the caller did not make, CONFLICT once its money arrived or it was discarded.",
		type: PaymentTransactionRef,
		args: {
			id: t.arg.id({ required: true }),
			reported: t.arg.boolean({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanActAsPayer({ ctx, id: args.id });
			await reportPaymentTransfer({ id: args.id, reported: args.reported });
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
	}),

	discardPaymentTransaction: t.drizzleField({
		description:
			'The payer gives a reference up to start over with another selection (`discardedAt`). It is kept, so participant care can still match a transfer made with it, but `createPaymentTransaction` no longer answers it. FORBIDDEN for an AI assistant and while impersonating, NOT_FOUND for a payment the caller did not make, CONFLICT once its money arrived or it was discarded already.',
		type: PaymentTransactionRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanActAsPayer({ ctx, id: args.id });
			await discardPaymentTransaction(args.id);
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
