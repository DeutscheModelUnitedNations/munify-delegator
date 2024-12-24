import {
	findManyPaymentTransactionQueryObject,
	findUniquePaymentTransactionQueryObject,
	PaymentTransactionAmountFieldObject,
	PaymentTransactionConferenceFieldObject,
	PaymentTransactionCreatedAtFieldObject,
	PaymentTransactionIdFieldObject,
	PaymentTransactionUserFieldObject
} from '$db/generated/graphql/PaymentTransaction';
import { builder } from '../builder';

builder.prismaObject('PaymentTransaction', {
	fields: (t) => ({
		id: t.field(PaymentTransactionIdFieldObject),
		amount: t.field(PaymentTransactionAmountFieldObject),
		createdAt: t.field(PaymentTransactionCreatedAtFieldObject),
		receivedAt: t.field(PaymentTransactionCreatedAtFieldObject),
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
		findUniqueNation: t.prismaField({
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
