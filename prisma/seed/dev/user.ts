import { FoodPreference, Gender, User } from '@prisma/client';
import { faker } from '@faker-js/faker';

export function makeSeedUser(): User {
	return {
		id: faker.database.mongodbObjectId(),
		apartment: faker.location.buildingNumber(),
		street: faker.location.street(),
		zip: faker.location.zipCode(),
		birthday: faker.date.birthdate({ mode: 'age', min: 14, max: 50 }),
		city: faker.location.city(),
		country: faker.location.country(),
		email: faker.internet.email(),
		family_name: faker.person.lastName(),
		foodPreference: faker.helpers.arrayElement(Object.values(FoodPreference)),
		gender: faker.helpers.arrayElement(Object.values(Gender)),
		given_name: faker.person.firstName(),
		locale: faker.location.countryCode({ variant: 'alpha-3' }),
		phone: faker.phone.number(),
		preferred_username: faker.internet.username(),
		pronouns: faker.helpers.arrayElement(['he/him', 'she/her', 'they/them']),
		wantsJoinTeamInformation: faker.datatype.boolean(),
		wantsToReceiveGeneralInformation: faker.datatype.boolean()
	};
}
