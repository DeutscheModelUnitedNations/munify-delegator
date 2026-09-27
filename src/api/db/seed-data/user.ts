import { faker } from '@faker-js/faker';
import type { Insert } from '../rows';

const FOOD_PREFERENCES = ['OMNIVORE', 'VEGETARIAN', 'VEGAN'] as const;
const GENDERS = ['MALE', 'FEMALE', 'DIVERSE', 'NO_STATEMENT'] as const;

export function makeSeedUser(): Insert<'user'> {
	return {
		id: faker.database.mongodbObjectId(),
		apartment: faker.location.buildingNumber(),
		street: faker.location.street(),
		zip: faker.location.zipCode(),
		birthday: faker.date.birthdate({ mode: 'age', min: 14, max: 50 }),
		city: faker.location.city(),
		country: faker.location.country(),
		email: faker.internet.email(),
		familyName: faker.person.lastName(),
		foodPreference: faker.helpers.arrayElement(FOOD_PREFERENCES),
		gender: faker.helpers.arrayElement(GENDERS),
		givenName: faker.person.firstName(),
		locale: faker.location.countryCode({ variant: 'alpha-3' }),
		phone: faker.phone.number(),
		preferredUsername: faker.internet.username(),
		pronouns: faker.helpers.arrayElement(['he/him', 'she/her', 'they/them']),
		wantsJoinTeamInformation: faker.datatype.boolean(),
		wantsToReceiveGeneralInformation: faker.datatype.boolean(),
		createdAt: faker.date.past(),
		updatedAt: faker.date.past()
	};
}
