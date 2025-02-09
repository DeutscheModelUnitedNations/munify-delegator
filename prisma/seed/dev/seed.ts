import { faker } from '@faker-js/faker';
import { makeSeedConference } from './conference';
import {
	ConferenceState,
	type DelegationMember,
	PrismaClient,
	type RoleApplication,
	type User
} from '@prisma/client';
import { createDefaultData } from '../../defaultData/createDefaultData';
import { makeSeedCommittee } from './committee';
import { makeSeedUser } from './user';
import { makeSeedNSA } from './nonStateActor';
import { makeSeedCustomConferenceRole } from './customConferenceRole';
import { makeSeedDelegation } from './delegation';
import { makeSeedDelegationMember } from './delegationMember';
import { makeSeedConferenceSupervisor } from './conferenceSupervisor';
import { makeSeedSingleParticipant } from './singleParticipant';
import { makeSeedTeamMember } from './teamMember';

// force static seed for reproducible data
faker.seed(123);

const _db = new PrismaClient();

await _db.$transaction(async (db) => {
	// creating default data
	const { nations } = await createDefaultData(db);

	const users: User[] = [];
	for (let i = 0; i < 1000; i++) {
		users.push(makeSeedUser());
	}

	function takeXUsers(x: number) {
		return users.splice(0, x);
	}

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

	await Promise.all(
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

			const conferenceIsInAssignedState = !(
				[ConferenceState.PRE, ConferenceState.PARTICIPANT_REGISTRATION] as ConferenceState[]
			).includes(conference.state);

			const committees = [
				makeSeedCommittee({
					conferenceId: conference.id,
					nations: {
						connect: faker.helpers
							.arrayElements(nations, { min: 6, max: 36 })
							.map((nation) => ({ alpha3Code: nation.alpha3Code }))
					}
				}),
				makeSeedCommittee({
					conferenceId: conference.id,
					nations: {
						connect: faker.helpers
							.arrayElements(nations, { min: 6, max: 36 })
							.map((nation) => ({ alpha3Code: nation.alpha3Code }))
					}
				}),
				makeSeedCommittee({
					conferenceId: conference.id,
					nations: {
						connect: faker.helpers
							.arrayElements(nations, { min: 6, max: 36 })
							.map((nation) => ({ alpha3Code: nation.alpha3Code }))
					}
				}),
				makeSeedCommittee({
					conferenceId: conference.id,
					nations: {
						connect: faker.helpers
							.arrayElements(nations, { min: 6, max: 36 })
							.map((nation) => ({ alpha3Code: nation.alpha3Code }))
					}
				}),
				makeSeedCommittee({
					conferenceId: conference.id,
					nations: {
						connect: faker.helpers
							.arrayElements(nations, { min: 6, max: 36 })
							.map((nation) => ({ alpha3Code: nation.alpha3Code }))
					}
				})
			];

			const dbcommittees = await Promise.all(
				committees.map((committee) => {
					return db.committee.upsert({
						where: {
							id: committee.id
						},
						update: committee,
						create: committee,
						include: {
							nations: true
						}
					});
				})
			);

			const allNationsRepresentedInCommittees = dbcommittees.flatMap((c) => c.nations);

			const nonStateActors = [
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id })
			];

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

			const customConferenceRoles = [
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id }),
				makeSeedCustomConferenceRole({ conferenceId: conference.id })
			];

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

			const delegations = [
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id }),
				makeSeedDelegation({ conferenceId: conference.id })
			];

			const dbdelegations = await Promise.all(
				delegations.map(async (delegation) => {
					await db.delegation.upsert({
						where: {
							id: delegation.id
						},
						update: delegation,
						create: delegation
					});

					const delegationMembers: DelegationMember[] = [];

					for (let i = 0; i < faker.number.int({ min: 1, max: 6 }); i++) {
						delegationMembers.push(
							makeSeedDelegationMember({
								delegationId: delegation.id,
								conferenceId: conference.id,
								userId: takeXUsers(1)[0].id,
								isHeadDelegate: false,
								assignedCommitteeId: conferenceIsInAssignedState ? committees[4].id : undefined
							})
						);
					}

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

					const delegationRoleApplications: RoleApplication[] = [
						{
							id: faker.database.mongodbObjectId(),
							delegationId: delegation.id,
							rank: 0,
							nationId: allNationsRepresentedInCommittees[0].alpha3Code,
							nonStateActorId: null
						},
						{
							id: faker.database.mongodbObjectId(),
							delegationId: delegation.id,
							rank: 1,
							nationId: allNationsRepresentedInCommittees[1].alpha3Code,
							nonStateActorId: null
						},
						{
							id: faker.database.mongodbObjectId(),
							delegationId: delegation.id,
							rank: 2,
							nationId: null,
							nonStateActorId: nonStateActors[0].id
						}
					];

					await Promise.all(
						delegationRoleApplications.map(async (delegationRoleApplication) => {
							await db.roleApplication.upsert({
								where: {
									id: delegationRoleApplication.id
								},
								update: delegationRoleApplication,
								create: delegationRoleApplication
							});
						})
					);

					if (conferenceIsInAssignedState) {
						if (faker.datatype.boolean()) {
							await db.delegation.update({
								where: {
									id: delegation.id
								},
								data: {
									assignedNationAlpha3Code: faker.helpers.arrayElement(
										allNationsRepresentedInCommittees
									).alpha3Code
								}
							});
						} else {
							await db.delegation.update({
								where: {
									id: delegation.id
								},
								data: {
									assignedNonStateActorId: faker.helpers.arrayElement(nonStateActors).id
								}
							});
						}
					}

					return {
						...delegation,
						members: delegationMembers,
						appliedForRoles: delegationRoleApplications
					};
				})
			);

			const conferenceSupervisors = [
				makeSeedConferenceSupervisor({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					delegations: conferenceIsInAssignedState
						? undefined
						: {
								connect: [{ id: delegations[0].id }, { id: delegations[1].id }]
							},
					postAssignmentDelegeationMembers: conferenceIsInAssignedState
						? {
								connect: [
									{ id: dbdelegations[0].members[0].id },
									{ id: dbdelegations[0].members[1].id }
								]
							}
						: undefined
				}),
				makeSeedConferenceSupervisor({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					delegations: conferenceIsInAssignedState
						? undefined
						: {
								connect: [{ id: delegations[0].id }, { id: delegations[1].id }]
							},
					postAssignmentDelegeationMembers: conferenceIsInAssignedState
						? {
								connect: [
									{ id: dbdelegations[0].members[0].id },
									{ id: dbdelegations[0].members[1].id }
								]
							}
						: undefined
				}),
				makeSeedConferenceSupervisor({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					delegations: conferenceIsInAssignedState
						? undefined
						: {
								connect: [{ id: delegations[0].id }, { id: delegations[1].id }]
							},
					postAssignmentDelegeationMembers: conferenceIsInAssignedState
						? {
								connect: [
									{ id: dbdelegations[0].members[0].id },
									{ id: dbdelegations[0].members[1].id }
								]
							}
						: undefined
				}),
				makeSeedConferenceSupervisor({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedConferenceSupervisor({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedConferenceSupervisor({ conferenceId: conference.id, userId: takeXUsers(1)[0].id })
			];

			await Promise.all(
				conferenceSupervisors.map(async (conferenceSupervisor) => {
					await db.conferenceSupervisor.upsert({
						where: {
							id: conferenceSupervisor.id
						},
						update: conferenceSupervisor,
						create: conferenceSupervisor
					});
				})
			);

			const singleApplications = [
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				}),
				makeSeedSingleParticipant({
					conferenceId: conference.id,
					userId: takeXUsers(1)[0].id,
					assignedRoleId: conferenceIsInAssignedState
						? faker.helpers.arrayElement(customConferenceRoles).id
						: null
				})
			];

			await Promise.all(
				singleApplications.map(async (singleApplication) => {
					await db.singleParticipant.upsert({
						where: {
							id: singleApplication.id
						},
						update: singleApplication,
						create: singleApplication
					});
				})
			);

			const teamMembers = [
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id }),
				makeSeedTeamMember({ conferenceId: conference.id, userId: takeXUsers(1)[0].id })
			];

			await Promise.all(
				teamMembers.map(async (teamMember) => {
					await db.teamMember.upsert({
						where: {
							id: teamMember.id
						},
						update: teamMember,
						create: teamMember
					});
				})
			);
		})
	);
});

console.info('Done!');
