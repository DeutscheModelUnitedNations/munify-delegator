import { faker } from '@faker-js/faker';
import { makeSeedConference } from './conference';
import { PrismaClient, User } from '@prisma/client';
import { createDefaultData } from '../../defaultData/createDefaultData';
import { makeSeedCommittee } from './committee';
import { makeSeedUser } from './user';
import { makeSeedNSA } from './nonStateActor';
import { makeSeedCustomConferenceRole } from './customConferenceRole';

// force static seed for reproducible data
faker.seed(123);

const _db = new PrismaClient();

_db.$transaction(async (db) => {
	// creating default data
	await createDefaultData(db);

	console.info('Seeding conferences...');

	const conferences = await Promise.all(
		[
			makeSeedConference({ state: 'PRE' }),
			makeSeedConference({ state: 'PARTICIPANT_REGISTRATION' }),
			makeSeedConference({ state: 'PREPARATION' }),
			makeSeedConference({ state: 'ACTIVE' }),
			makeSeedConference({ state: 'POST' })
		].map(async (conference) => {
			await db.conference.upsert({
				where: {
					id: conference.id
				},
				update: conference,
				create: conference
			});

			const committees = [
				makeSeedCommittee({ conference: { id: conference.id } }),
				makeSeedCommittee({ conference: { id: conference.id } }),
				makeSeedCommittee({ conference: { id: conference.id } }),
				makeSeedCommittee({ conference: { id: conference.id } }),
				makeSeedCommittee({ conference: { id: conference.id } }),
				makeSeedCommittee({ conference: { id: conference.id } })
			];

			console.info(`Seeding committees for conference ${conference.id}...`);

			await Promise.all(
				committees.map(async (committee) => {
					await db.committee.upsert({
						where: {
							id: committee.id
						},
						update: committee,
						create: committee
					});
				})
			);

			console.info(`Seeded committees for conference ${conference.id} successfully!`);

			const nonStateActors = [
				makeSeedNSA({ conference: { id: conference.id } }),
				makeSeedNSA({ conference: { id: conference.id } }),
				makeSeedNSA({ conference: { id: conference.id } }),
				makeSeedNSA({ conference: { id: conference.id } }),
				makeSeedNSA({ conference: { id: conference.id } }),
				makeSeedNSA({ conference: { id: conference.id } })
			];

			console.info(`Seeding nonStateActors for conference ${conference.id}...`);

			await Promise.all(
				nonStateActors.map(async (nonStateActor) => {
					await db.nonStateActor.upsert({
						where: {
							id: nonStateActor.id
						},
						update: nonStateActor,
						create: nonStateActor
					});
				})
			);

			console.info(`Seeded nonStateActors for conference ${conference.id} successfully!`);

			const customConferenceRoles = [
				makeSeedCustomConferenceRole({ conference: { id: conference.id } }),
				makeSeedCustomConferenceRole({ conference: { id: conference.id } }),
				makeSeedCustomConferenceRole({ conference: { id: conference.id } }),
				makeSeedCustomConferenceRole({ conference: { id: conference.id } }),
				makeSeedCustomConferenceRole({ conference: { id: conference.id } }),
				makeSeedCustomConferenceRole({ conference: { id: conference.id } })
			];

			console.info(`Seeding customConferenceRoles for conference ${conference.id}...`);

			await Promise.all(
				customConferenceRoles.map(async (customConferenceRole) => {
					await db.customConferenceRole.upsert({
						where: {
							id: customConferenceRole.id
						},
						update: customConferenceRole,
						create: customConferenceRole
					});
				})
			);

			console.info(`Seeded customConferenceRoles for conference ${conference.id} successfully!`);

			return {
				conference,
				committees,
				nonStateActors,
				customConferenceRoles
			};
		})
	);
	console.info('Seeded conferences successfully!');

	const users: User[] = [];
	for (let i = 0; i < 1000; i++) {
		users.push(makeSeedUser());
	}

	console.info('Seeding users...');
	await Promise.all(
		users.map(async (user) =>
			db.user.upsert({
				where: {
					id: user.id
				},
				update: user,
				create: user
			})
		)
	);
	console.info('Seeded users successfully!');

	// create some delegations

	await Promise.all(conferences.map(async ({conference}) => {
		
	}));
});
