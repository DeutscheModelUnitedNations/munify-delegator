import { faker } from '@faker-js/faker';
import { makeSeedConference } from './conference';
import { PrismaClient, User } from '@prisma/client';
import { createDefaultData } from '../../defaultData/createDefaultData';
import { makeSeedCommittee } from './committee';
import { makeSeedUser } from './user';
import { makeSeedNSA } from './nonStateActor';
import { makeSeedCustomConferenceRole } from './customConferenceRole';
import { makeSeedDelegation } from './delegation';
import { makeSeedDelegationMember } from './delegationMember';

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
				makeSeedCommittee({ conferenceId: conference.id }),
				makeSeedCommittee({ conferenceId: conference.id }),
				makeSeedCommittee({ conferenceId: conference.id }),
				makeSeedCommittee({ conferenceId: conference.id }),
				makeSeedCommittee({ conferenceId: conference.id }),
				makeSeedCommittee({ conferenceId: conference.id })
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
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id })
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
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id })
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

	function takeXUsers(x: number) {
		return users.splice(0, x);
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
	await Promise.all(
		conferences.map(async ({ conference }) => {
			const delegations = [
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id })
			];

			await Promise.all(
				delegations.map(async (delegation) => {
					await db.delegation.upsert({
						where: {
							id: delegation.id
						},
						update: delegation,
						create: delegation
					});

					const delegationMembers = [
						makeSeedDelegationMember({
							delegationId: delegation.id,
							conferenceId: conference.id,
							userId: takeXUsers(1)[0].id,
							isHeadDelegate: true
						}),
						makeSeedDelegationMember({
							delegationId: delegation.id,
							conferenceId: conference.id,
							userId: takeXUsers(1)[0].id,
							isHeadDelegate: false
						}),
						makeSeedDelegationMember({
							delegationId: delegation.id,
							conferenceId: conference.id,
							userId: takeXUsers(1)[0].id,
							isHeadDelegate: false
						}),
						makeSeedDelegationMember({
							delegationId: delegation.id,
							conferenceId: conference.id,
							userId: takeXUsers(1)[0].id,
							isHeadDelegate: false
						}),
						makeSeedDelegationMember({
							delegationId: delegation.id,
							conferenceId: conference.id,
							userId: takeXUsers(1)[0].id,
							isHeadDelegate: false
						})
					];

					await Promise.all(
						delegationMembers.map(async (delegationMember) => {
							await db.delegationMember.upsert({
								where: {
									id: delegationMember.id
								},
								update: delegationMember,
								create: delegationMember
							});
						})
					);
				})
			);
		})
	);
});
