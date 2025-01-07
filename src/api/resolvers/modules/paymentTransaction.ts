import {
	createOnePaymentTransactionMutationObject,
	findManyPaymentTransactionQueryObject,
	findUniquePaymentTransactionQueryObject,
	PaymentTransactionAmountFieldObject,
	PaymentTransactionConferenceFieldObject,
	PaymentTransactionCreatedAtFieldObject,
	PaymentTransactionIdFieldObject,
	PaymentTransactionRecievedAtFieldObject,
	PaymentTransactionUserFieldObject
} from '$db/generated/graphql/PaymentTransaction';
import { db } from '$db/db';
import { builder } from '../builder';
import { GraphQLError } from 'graphql';

builder.prismaObject('PaymentTransaction', {
	fields: (t) => ({
		id: t.field(PaymentTransactionIdFieldObject),
		amount: t.field(PaymentTransactionAmountFieldObject),
		createdAt: t.field(PaymentTransactionCreatedAtFieldObject),
		recievedAt: t.field(PaymentTransactionRecievedAtFieldObject),
		conference: t.relation('conference', PaymentTransactionConferenceFieldObject),
		user: t.relation('user', PaymentTransactionUserFieldObject)
	})
});

builder.queryFields((t) => {
	const field = findManyPaymentTransactionQueryObject(t);
	return {
		findManyPaymentTransactions: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').PaymentTransaction]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniquePaymentTransactionQueryObject(t);
	return {
		findUniquePaymentTransaction: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').PaymentTransaction]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

const generateSEPASafeId = () => {
	const chars = 'ACDEFHJKMNPRTUVWXY3479';
	const len = 16;
	let id = '';
	for (let i = 0; i < len; i++) {
		id += chars[Math.floor(Math.random() * chars.length)];
		if (i % 4 === 3 && i !== len - 1) {
			id += '-';
		}
	}
	return id;
};

builder.mutationFields((t) => {
	const field = createOnePaymentTransactionMutationObject(t);
	return {
		createOnePaymentTransaction: t.prismaField({
			...field,
			args: {
				conferenceId: t.arg.id(),
				userId: t.arg.id(),
				paymentFor: t.arg.idList()
			},
			resolve: async (query, root, args, ctx) => {
				const conference = await db.conference.findUnique({
					where: { id: args.conferenceId }
				});

				if (!conference) {
					throw new GraphQLError('Conference not found');
				}

				if (!conference.feeAmount) {
					throw new GraphQLError('Conference fee not set');
				}

				let id = generateSEPASafeId();
				for (let i = 0; i < 9999; i++) {
					id = generateSEPASafeId();
					const exists = await db.paymentTransaction.findUnique({ where: { id } });
					if (!exists) {
						break;
					}
					if (i === 9999) {
						throw new GraphQLError('Failed to generate unique id');
					}
				}

				const res = await db.paymentTransaction.create({
					data: {
						id,
						amount: args.paymentFor.length * conference.feeAmount,
						conference: { connect: { id: args.conferenceId } },
						user: {
							connect: { id: args.userId }
						},
						paymentFor: {
							createMany: {
								data: args.paymentFor.map((id) => ({ userId: id }))
							}
						}
					}
				});

				return res;
			}
		})
	};
});
