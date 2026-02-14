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
import { makeSeedPaymentTransaction } from './paymentTransaction';
import { makeSeedCalendarDay, makeSeedCalendarTrack, makeSeedCalendarEntry } from './calendarDay';

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
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
				makeSeedNSA({ conferenceId: conference.id }),
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
							nonStateActorId: null,
							createdAt: faker.date.past(),
							updatedAt: faker.date.past()
						},
						{
							id: faker.database.mongodbObjectId(),
							delegationId: delegation.id,
							rank: 1,
							nationId: allNationsRepresentedInCommittees[1].alpha3Code,
							nonStateActorId: null,
							createdAt: faker.date.past(),
							updatedAt: faker.date.past()
						},
						{
							id: faker.database.mongodbObjectId(),
							delegationId: delegation.id,
							rank: 2,
							nationId: null,
							nonStateActorId: nonStateActors[0].id,
							createdAt: faker.date.past(),
							updatedAt: faker.date.past()
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
									{ id: dbdelegations[1].members[0].id },
									{ id: dbdelegations[1].members[1].id }
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
									{ id: dbdelegations[1].members[0].id },
									{ id: dbdelegations[1].members[1].id }
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
									{ id: dbdelegations[1].members[0].id },
									{ id: dbdelegations[1].members[1].id }
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

			const paymentTransaction = [
				makeSeedPaymentTransaction({
					conferenceId: conference.id,
					userId: dbdelegations[0].members[0].userId,
					paymentFor: {
						createMany: {
							data: dbdelegations[0].members.slice(1).map((m) => ({ userId: m.userId }))
						}
					}
				}),
				makeSeedPaymentTransaction({
					conferenceId: conference.id,
					userId: dbdelegations[1].members[0].userId,
					paymentFor: {
						createMany: {
							data: dbdelegations[1].members.slice(1).map((m) => ({ userId: m.userId }))
						}
					}
				}),
				makeSeedPaymentTransaction({
					conferenceId: conference.id,
					userId: dbdelegations[2].members[0].userId,
					paymentFor: {
						createMany: {
							data: dbdelegations[2].members.slice(1).map((m) => ({ userId: m.userId }))
						}
					}
				}),
				makeSeedPaymentTransaction({
					conferenceId: conference.id,
					userId: dbdelegations[3].members[0].userId,
					paymentFor: {
						createMany: {
							data: dbdelegations[3].members.slice(1).map((m) => ({ userId: m.userId }))
						}
					}
				})
			];

			await Promise.all(
				paymentTransaction.map(async (paymentTransaction) => {
					await db.paymentTransaction.upsert({
						where: {
							id: paymentTransaction.id
						},
						update: paymentTransaction,
						create: paymentTransaction
					});
				})
			);

			// Calendar data for ACTIVE conference
			if (conference.state === 'ACTIVE') {
				const baseDate = new Date(conference.startConference);

				const day1 = makeSeedCalendarDay({
					conferenceId: conference.id,
					name: 'Donnerstag',
					date: baseDate,
					sortOrder: 0
				});
				const day2Date = new Date(baseDate);
				day2Date.setDate(day2Date.getDate() + 1);
				const day2 = makeSeedCalendarDay({
					conferenceId: conference.id,
					name: 'Freitag',
					date: day2Date,
					sortOrder: 1
				});
				const day3Date = new Date(baseDate);
				day3Date.setDate(day3Date.getDate() + 2);
				const day3 = makeSeedCalendarDay({
					conferenceId: conference.id,
					name: 'Samstag',
					date: day3Date,
					sortOrder: 2
				});

				const calendarDays = [day1, day2, day3];
				await Promise.all(
					calendarDays.map((d) =>
						db.calendarDay.upsert({ where: { id: d.id }, update: d, create: d })
					)
				);

				// Tracks for each day
				const makeTracksForDay = (dayId: string) => [
					makeSeedCalendarTrack({ calendarDayId: dayId, name: 'GV Presse', sortOrder: 0 }),
					makeSeedCalendarTrack({ calendarDayId: dayId, name: 'IMO MRR', sortOrder: 1 }),
					makeSeedCalendarTrack({
						calendarDayId: dayId,
						name: 'Sicherheitsrat',
						sortOrder: 2
					})
				];

				const day1Tracks = makeTracksForDay(day1.id);
				const day2Tracks = makeTracksForDay(day2.id);
				const day3Tracks = makeTracksForDay(day3.id);
				const allTracks = [...day1Tracks, ...day2Tracks, ...day3Tracks];

				await Promise.all(
					allTracks.map((t) =>
						db.calendarTrack.upsert({ where: { id: t.id }, update: t, create: t })
					)
				);

				// Helper to create a datetime on a specific day at a given hour:minute
				function makeTime(date: Date, hours: number, minutes: number): Date {
					const d = new Date(date);
					d.setHours(hours, minutes, 0, 0);
					return d;
				}

				const day1Entries = [
					// Opening ceremony (cross-track)
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						name: 'Eröffnungsfeier',
						startTime: makeTime(baseDate, 10, 0),
						endTime: makeTime(baseDate, 11, 30),
						color: 'CEREMONY',
						fontAwesomeIcon: 'flag',
						place: 'Landtag Niedersachsen',
						room: 'Plenarsaal'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						name: 'Mittagspause',
						startTime: makeTime(baseDate, 11, 30),
						endTime: makeTime(baseDate, 12, 30),
						color: 'BREAK',
						fontAwesomeIcon: 'utensils'
					}),
					// Afternoon sessions (per-track)
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						calendarTrackId: day1Tracks[0].id,
						name: 'Sitzung I',
						startTime: makeTime(baseDate, 12, 30),
						endTime: makeTime(baseDate, 14, 30),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 201'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						calendarTrackId: day1Tracks[1].id,
						name: 'Sitzung I',
						startTime: makeTime(baseDate, 12, 30),
						endTime: makeTime(baseDate, 14, 30),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 202'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						calendarTrackId: day1Tracks[2].id,
						name: 'Sitzung I',
						startTime: makeTime(baseDate, 12, 30),
						endTime: makeTime(baseDate, 14, 30),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 203'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						name: 'Kaffeepause',
						startTime: makeTime(baseDate, 14, 30),
						endTime: makeTime(baseDate, 15, 0),
						color: 'BREAK',
						fontAwesomeIcon: 'mug-hot'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						calendarTrackId: day1Tracks[0].id,
						name: 'Sitzung II',
						startTime: makeTime(baseDate, 15, 0),
						endTime: makeTime(baseDate, 17, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 201'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						calendarTrackId: day1Tracks[1].id,
						name: 'Sitzung II',
						startTime: makeTime(baseDate, 15, 0),
						endTime: makeTime(baseDate, 17, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 202'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						calendarTrackId: day1Tracks[2].id,
						name: 'Sitzung II',
						startTime: makeTime(baseDate, 15, 0),
						endTime: makeTime(baseDate, 17, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 203'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day1.id,
						name: 'Abendessen',
						startTime: makeTime(baseDate, 17, 30),
						endTime: makeTime(baseDate, 18, 30),
						color: 'SOCIAL',
						fontAwesomeIcon: 'utensils'
					})
				];

				const day2Entries = [
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						calendarTrackId: day2Tracks[0].id,
						name: 'Sitzung III',
						startTime: makeTime(day2Date, 9, 0),
						endTime: makeTime(day2Date, 11, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 201'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						calendarTrackId: day2Tracks[1].id,
						name: 'Sitzung III',
						startTime: makeTime(day2Date, 9, 0),
						endTime: makeTime(day2Date, 11, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 202'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						calendarTrackId: day2Tracks[2].id,
						name: 'Sitzung III',
						startTime: makeTime(day2Date, 9, 0),
						endTime: makeTime(day2Date, 11, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 203'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						name: 'Mittagspause',
						startTime: makeTime(day2Date, 11, 0),
						endTime: makeTime(day2Date, 12, 0),
						color: 'BREAK',
						fontAwesomeIcon: 'utensils'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						name: 'Workshop: Diplomatische Verhandlungen',
						startTime: makeTime(day2Date, 12, 0),
						endTime: makeTime(day2Date, 13, 30),
						color: 'WORKSHOP',
						fontAwesomeIcon: 'chalkboard-user',
						room: 'Saal A'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						calendarTrackId: day2Tracks[0].id,
						name: 'Sitzung IV',
						startTime: makeTime(day2Date, 13, 30),
						endTime: makeTime(day2Date, 15, 30),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 201'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						calendarTrackId: day2Tracks[1].id,
						name: 'Sitzung IV',
						startTime: makeTime(day2Date, 13, 30),
						endTime: makeTime(day2Date, 15, 30),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 202'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						calendarTrackId: day2Tracks[2].id,
						name: 'Sitzung IV',
						startTime: makeTime(day2Date, 13, 30),
						endTime: makeTime(day2Date, 15, 30),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 203'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day2.id,
						name: 'Delegiertenabend',
						startTime: makeTime(day2Date, 18, 0),
						endTime: makeTime(day2Date, 22, 0),
						color: 'SOCIAL',
						fontAwesomeIcon: 'party-horn',
						place: 'Kulturzentrum'
					})
				];

				const day3Entries = [
					makeSeedCalendarEntry({
						calendarDayId: day3.id,
						calendarTrackId: day3Tracks[0].id,
						name: 'Sitzung V',
						startTime: makeTime(day3Date, 9, 0),
						endTime: makeTime(day3Date, 11, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 201'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day3.id,
						calendarTrackId: day3Tracks[1].id,
						name: 'Sitzung V',
						startTime: makeTime(day3Date, 9, 0),
						endTime: makeTime(day3Date, 11, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 202'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day3.id,
						calendarTrackId: day3Tracks[2].id,
						name: 'Sitzung V',
						startTime: makeTime(day3Date, 9, 0),
						endTime: makeTime(day3Date, 11, 0),
						color: 'SESSION',
						fontAwesomeIcon: 'gavel',
						room: 'Raum 203'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day3.id,
						name: 'Mittagspause',
						startTime: makeTime(day3Date, 11, 0),
						endTime: makeTime(day3Date, 12, 0),
						color: 'BREAK',
						fontAwesomeIcon: 'utensils'
					}),
					makeSeedCalendarEntry({
						calendarDayId: day3.id,
						name: 'Abschlussfeier',
						startTime: makeTime(day3Date, 12, 0),
						endTime: makeTime(day3Date, 14, 0),
						color: 'CEREMONY',
						fontAwesomeIcon: 'award',
						place: 'Landtag Niedersachsen',
						room: 'Plenarsaal'
					})
				];

				const allEntries = [...day1Entries, ...day2Entries, ...day3Entries];
				await Promise.all(
					allEntries.map((e) =>
						db.calendarEntry.upsert({ where: { id: e.id }, update: e, create: e })
					)
				);
			}
		})
	);
});

console.info('Done!');
