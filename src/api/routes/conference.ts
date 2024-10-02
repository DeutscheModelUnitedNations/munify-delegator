import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissions';
import { ConferencePlain } from '$db/generated/schema/Conference';
import { UserPlain } from '$db/generated/schema/User';
import type { User } from '@prisma/client';
import { requireToBeConferenceAdmin } from '$api/auth/helper/requireUserToBeConferenceAdmin';

export const conference = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getAll('conference'))
	.use(CRUDMaker.getOne('conference'))
	.use(CRUDMaker.createOne('conference'))
	.use(CRUDMaker.updateOne('conference'))
	.use(CRUDMaker.deleteOne('conference'))
	.get(
		'my-conferences',
		async ({ permissions }) => {
			const user = permissions.mustBeLoggedIn();

			return await db.conference.findMany({
				where: {
					OR: [
						{ conferenceSupervisors: { some: { userId: user.sub } } },
						{ teamMembers: { some: { userId: user.sub } } },
						{ singleParticipant: { some: { userId: user.sub } } },
						{ delegations: { some: { members: { some: { userId: user.sub } } } } }
					],
					AND: [permissions.allowDatabaseAccessTo('list').Conference]
				}
			});
		},
		{
			response: t.Array(ConferencePlain)
		}
	)
	.get(
		'conference/:id/plausibility',
		async ({ params }) => {
			const conferenceId = params.id;
			const findings: {
				userFindings: {
					tooYoungUsers: User[];
					tooOldUsers: User[];
					shouldBeSupervisor: User[];
					shouldNotBeSupervisor: User[];
					dataMissing: User[];
				};
			} = {
				userFindings: {
					tooYoungUsers: [],
					tooOldUsers: [],
					shouldBeSupervisor: [],
					shouldNotBeSupervisor: [],
					dataMissing: []
				}
			};
			const conference = await db.conference.findUnique({
				where: {
					id: conferenceId
				}
			});
			if (!conference) {
				throw new Error('Conference not found');
			}

			// Check for too young users
			findings.userFindings.tooYoungUsers = await db.user.findMany({
				where: {
					AND: [
						{
							OR: [
								{ singleParticipant: { some: { conferenceId } } },
								{ delegationMemberships: { some: { conferenceId } } }
							]
						},
						{
							birthday: {
								gt: new Date(new Date().getFullYear() - 13, 0, 1)
							}
						}
					]
				}
			});

			// Check for too old users
			findings.userFindings.tooOldUsers = await db.user.findMany({
				where: {
					AND: [
						{
							OR: [
								{ singleParticipant: { some: { conferenceId } } },
								{ delegationMemberships: { some: { conferenceId } } }
							]
						},
						{
							birthday: {
								lt: new Date(new Date().getFullYear() - 21, 0, 1),
								gt: new Date(new Date().getFullYear() - 26, 0, 1)
							}
						}
					]
				}
			});

			// Check for users that should be supervisors
			findings.userFindings.shouldBeSupervisor = await db.user.findMany({
				where: {
					AND: [
						{
							OR: [
								{ singleParticipant: { some: { conferenceId } } },
								{ delegationMemberships: { some: { conferenceId } } }
							]
						},
						{ birthday: { lt: new Date(new Date().getFullYear() - 26, 0, 1) } }
					]
				}
			});

			// Check for users that should not be supervisors
			findings.userFindings.shouldNotBeSupervisor = await db.user.findMany({
				where: {
					AND: [
						{
							OR: [{ conferenceSupervisor: { some: { conferenceId } } }]
						},
						{ birthday: { gt: new Date(new Date().getFullYear() - 21, 0, 1) } }
					]
				}
			});

			// Check for users with missing or incomplete data
			const dataMissing = await db.user.findMany({
				where: {
					OR: [
						{ singleParticipant: { some: { conferenceId } } },
						{ delegationMemberships: { some: { conferenceId } } },
						{ conferenceSupervisor: { some: { conferenceId } } }
					]
				}
			});
			findings.userFindings.dataMissing = dataMissing.filter((u) => {
				if (
					!u.birthday ||
					!u.email ||
					!u.phone ||
					!u.street ||
					!u.city ||
					!u.zip ||
					!u.country ||
					!u.foodPreference
				)
					return true;
				// Too short names
				if (u.given_name.length < 3) return true;
				if (u.family_name.length < 3) return true;
				// Too short phone number
				if (u.phone.length < 5) return true;
				// Too short street name
				if (u.street.length < 5) return true;
				return false;
			});

			return findings;
		},
		{
			response: t.Object({
				userFindings: t.Object({
					tooYoungUsers: t.Array(UserPlain),
					tooOldUsers: t.Array(UserPlain),
					shouldBeSupervisor: t.Array(UserPlain),
					shouldNotBeSupervisor: t.Array(UserPlain),
					dataMissing: t.Array(UserPlain)
				})
			})
		}
	)
	.get(
		'conference/:id/statistics',
		async ({ params, permissions }) => {
			const user = permissions.mustBeLoggedIn();
			const conferenceId = params.id;

			await requireToBeConferenceAdmin({ conferenceId, user });

			const conference = await db.conference.findUniqueOrThrow({
				where: {
					id: conferenceId
				}
			});

			// Countdowns

			const now = new Date();
			const daysUntilConference = conference.start
				? Math.floor((conference.start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
				: undefined;
			const daysUntilEndRegistration = conference.endRegistration
				? Math.floor((conference.endRegistration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
				: undefined;

			const countdowns = {
				daysUntilConference,
				daysUntilEndRegistration
			};

			// Registration statistics

			const delegations = await db.delegation.findMany({
				where: {
					conferenceId
				},
				select: {
					applied: true,
					_count: {
						select: {
							members: true,
							supervisors: true
						}
					}
				}
			});

			const singleParticipants = await db.singleParticipant.findMany({
				where: {
					conferenceId
				},
				select: {
					applied: true
				}
			});

			const supervisors = await db.conferenceSupervisor.findMany({
				where: {
					conferenceId
				}
			});

			const roles = await db.customConferenceRole.findMany({
				where: {
					conferenceId
				},
				select: {
					name: true,
					fontAwesomeIcon: true,
					singleParticipant: {
						select: {
							applied: true
						}
					}
				}
			});

			const delegationsApplied = delegations.filter((d) => d.applied).length;
			const delegationsNotApplied = delegations.length - delegationsApplied;
			const delegationsWithSupervisor = delegations.reduce((acc, d) => {
				if (!d._count.supervisors) return acc;
				return acc + 1;
			}, 0);
			const delegationMembersApplied = delegations.reduce((acc, d) => {
				if (!d.applied) return acc;
				return acc + d._count.members;
			}, 0);
			const delegationMembersNotApplied =
				delegations.reduce((acc, d) => acc + d._count.members, 0) - delegationMembersApplied;
			const singleParticipantsApplied = singleParticipants.filter((sp) => sp.applied).length;
			const singleParticipantsNotApplied = singleParticipants.length - singleParticipantsApplied;
			const singleParticipantsByRole = roles.map((role) => ({
				role: role.name,
				fontAwesomeIcon: role.fontAwesomeIcon || undefined,
				total: role.singleParticipant.length,
				applied: role.singleParticipant.filter((sp) => sp.applied).length,
				notApplied: role.singleParticipant.filter((sp) => !sp.applied).length
			}));
			const totalApplied = delegationMembersApplied + singleParticipantsApplied;
			const totalNotApplied =
				delegations.reduce((acc, d) => acc + d._count.members, 0) +
				singleParticipants.length -
				totalApplied;

			const registrationStatistics = {
				total: totalApplied + totalNotApplied,
				notApplied: totalNotApplied,
				applied: totalApplied,
				delegations: {
					total: delegationsNotApplied + delegationsApplied,
					notApplied: delegationsNotApplied,
					applied: delegationsApplied,
					withSupervisor: delegationsWithSupervisor
				},
				delegationMembers: {
					total: delegationMembersNotApplied + delegationMembersApplied,
					notApplied: delegationMembersNotApplied,
					applied: delegationMembersApplied
				},
				singleParticipants: {
					total: singleParticipantsNotApplied + singleParticipantsApplied,
					notApplied: singleParticipantsNotApplied,
					applied: singleParticipantsApplied,
					byRole: singleParticipantsByRole
				},
				supervisors: supervisors.length
			};

			// Age statistics

			const usersBirthdays = await db.user.findMany({
				where: {
					OR: [
						{ singleParticipant: { some: { conferenceId, applied: true } } },
						{
							delegationMemberships: {
								some: {
									conferenceId,
									delegation: {
										applied: true
									}
								}
							}
						}
					]
				},
				select: {
					birthday: true
				}
			});

			const agesAtConference = usersBirthdays
				.filter((u) => u.birthday)
				.map((u) => {
					const referenceDate = conference.end
						? conference.end
						: conference.start
							? conference.start
							: new Date();
					const age = referenceDate.getTime() - u.birthday!.getTime();
					return Math.floor(age / (1000 * 60 * 60 * 24 * 365));
				});

			const averageAge = parseFloat(
				(agesAtConference.reduce((acc, age) => acc + age, 0) / agesAtConference.length).toFixed(1)
			);
			const ageDistribution: Record<string, number> = {};
			for (let i = 10; i <= 25; i++) {
				if (!agesAtConference.includes(i)) continue;
				ageDistribution[i.toString()] = agesAtConference.filter((age) => age === i).length;
			}

			const ageStatistics = {
				average: averageAge,
				distribution: ageDistribution
			};

			return {
				countdowns,
				registered: registrationStatistics,
				age: ageStatistics
			};
		},
		{
			response: t.Object({
				countdowns: t.Object({
					daysUntilConference: t.Optional(t.Number()),
					daysUntilEndRegistration: t.Optional(t.Number())
				}),
				registered: t.Object({
					total: t.Number(),
					notApplied: t.Number(),
					applied: t.Number(),
					delegations: t.Object({
						total: t.Number(),
						notApplied: t.Number(),
						applied: t.Number(),
						withSupervisor: t.Number()
					}),
					delegationMembers: t.Object({
						total: t.Number(),
						notApplied: t.Number(),
						applied: t.Number()
					}),
					singleParticipants: t.Object({
						total: t.Number(),
						notApplied: t.Number(),
						applied: t.Number(),
						byRole: t.Array(
							t.Object({
								role: t.String(),
								fontAwesomeIcon: t.Optional(t.String()),
								total: t.Number(),
								notApplied: t.Number(),
								applied: t.Number()
							})
						)
					}),
					supervisors: t.Number()
				}),
				age: t.Object({
					average: t.Number(),
					distribution: t.Record(t.String(), t.Number())
				})
			})
		}
	);
