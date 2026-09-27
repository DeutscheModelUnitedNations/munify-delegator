import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

export function makeSeedPaymentTransaction(
	options: Pick<Insert<'paymentTransaction'>, 'conferenceId' | 'userId'>
): Insert<'paymentTransaction'> {
	return {
		...options,
		id: faker.database.mongodbObjectId(),
		amount: faker.number.int({ min: 1, max: 1000 }),
		createdAt: faker.date.past(),
		recievedAt: faker.helpers.arrayElement([null, faker.date.past()]),
		updatedAt: faker.date.past()
	};
}
