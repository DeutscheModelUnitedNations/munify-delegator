import type { PaymentTransaction } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedPaymentTransaction(
	options: Pick<PaymentTransaction, 'conferenceId' | 'userId'> &
		Partial<{
			paymentFor: {
				createMany: {
					data: {
						userId: string;
					}[];
				};
			};
		}>
): PaymentTransaction {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		amount: faker.number.int({ min: 1, max: 1000 }),
		createdAt: faker.date.past(),
		recievedAt: faker.helpers.arrayElement([null, faker.date.past()])
	};
}
