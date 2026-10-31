import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanCreatePaymentTransaction,
	assertCanUpdatePaymentTransaction,
	registerPaymentTransactionAbilities
} from './paymentTransactionPermissions';
import {
	applyPaymentStatus,
	createPaymentTransaction,
	paymentForSchema
} from './paymentTransactionService';

registerPaymentTransactionAbilities();

const PaymentTransactionRef = object({ table: 'paymentTransaction' });
query({ table: 'paymentTransaction' });
const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

schemaBuilder.mutationFields((t) => ({
	createPaymentTransaction: t.drizzleField({
		description:
			"Creates a payment reference paid by `userId` for the participants it covers, at the conference's fee per participant. Participant care makes one for anybody; everybody else only in their own name (FORBIDDEN otherwise) and for people they know in the conference: themselves, their delegation, the participants they supervise and the supervisors they share a student with. INVALID_INPUT when somebody named takes no part in the conference or the conference has no fee, CONFLICT when one of them has paid already.",
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
	})
}));
