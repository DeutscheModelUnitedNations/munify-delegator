import { db, schema } from '$api/db/db';
import { abilityBuilder, enum_, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { eq } from 'drizzle-orm';

// Ported from abilities/entities/paymentTransaction.ts
abilityBuilder.paymentTransaction.allow(['read', 'update', 'delete']).when(systemAdmin);

// Only project management and participant care of the conference, as in the CASL rules.
abilityBuilder.paymentTransaction.allow(['read', 'update']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

export const PaymentTransactionRef = object({ table: 'paymentTransaction' });
query({ table: 'paymentTransaction' });

const administrativeStatusEnum = enum_({ tsName: 'administrativeStatus' });

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
			const conference = await db.query.conference
				.findFirst({ where: { id: args.conferenceId } })
				.then(assertFindFirstExists);

			// Captured in a const so the narrowing survives into the transaction closure below,
			// rather than reaching for a non-null assertion there.
			const feeAmount = conference.feeAmount;
			if (!feeAmount) {
				throw new GraphQLError('Conference fee not set');
			}

			// The id is caller-generated rather than a nanoid, so retry until it is free.
			let id = generateSEPASafeId();
			for (let attempt = 0; attempt < 10_000; attempt++) {
				const clash = await db.query.paymentTransaction.findFirst({ where: { id } });
				if (!clash) break;
				if (attempt === 9_999) {
					throw new GraphQLError('Failed to generate unique id');
				}
				id = generateSEPASafeId();
			}

			await db.transaction(async (tx) => {
				await tx.insert(schema.paymentTransaction).values({
					id,
					amount: args.paymentFor.length * feeAmount,
					conferenceId: args.conferenceId,
					userId: args.userId
				});
				if (args.paymentFor.length > 0) {
					await tx
						.insert(schema.userReferenceInPaymentTransaction)
						.values(args.paymentFor.map((userId) => ({ paymentTransactionId: id, userId })));
				}
			});

			return db.query.paymentTransaction
				.findFirst(
					query(
						ctx.abilities.paymentTransaction.filter('read').merge({ where: { id } }).query.single
					)
				)
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
			const updatable = ctx.abilities.paymentTransaction
				.filter('update')
				.merge({ where: { id: args.id } });

			const transaction = await db.query.paymentTransaction
				.findFirst({ ...updatable.query.single, with: { paymentFor: true } })
				.then(assertFindFirstExists);

			await db.transaction(async (tx) => {
				if (args.assignedStatus === 'DONE') {
					await tx
						.update(schema.paymentTransaction)
						.set({ recievedAt: args.recievedAt ?? undefined })
						.where(eq(schema.paymentTransaction.id, args.id));
				}

				// The payment status is carried over to every participant the transaction covers,
				// creating their status row if it does not exist yet.
				for (const reference of transaction.paymentFor) {
					await tx
						.insert(schema.conferenceParticipantStatus)
						.values({
							userId: reference.userId,
							conferenceId: transaction.conferenceId,
							paymentStatus: args.assignedStatus
						})
						.onConflictDoUpdate({
							target: [
								schema.conferenceParticipantStatus.userId,
								schema.conferenceParticipantStatus.conferenceId
							],
							set: { paymentStatus: args.assignedStatus }
						});
				}
			});

			return db.query.paymentTransaction
				.findFirst(
					query(
						ctx.abilities.paymentTransaction.filter('read').merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
