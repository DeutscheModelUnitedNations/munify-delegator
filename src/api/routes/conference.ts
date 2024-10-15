import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { ConferencePlain } from '$db/generated/schema/Conference';
import { UserPlain } from '$db/generated/schema/User';
import type { PrismaClient, User } from '@prisma/client';
import { requireToBeConferenceAdmin } from '$api/auth/helper/requireUserToBeConferenceAdmin';
import { conferenceStats } from '$api/services/stats';
import { userDataCompleteCheck } from '$api/services/userDataComplete';

export const conference = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getOne('conference'))
	.use(CRUDMaker.createOne('conference'))
	.use(CRUDMaker.updateOne('conference'))
	.use(CRUDMaker.deleteOne('conference'))
	.get(
		'/conference',
		async ({ permissions, query }) => {
			let userId: string | undefined = undefined;
			try {
				userId = permissions.mustBeLoggedIn().sub;
			} catch (error) {}

			if (query.participating && !userId) {
				// in case the user wants their participating conferences
				// and is not logged in we just want to throw an error
				permissions.mustBeLoggedIn();
			}

			return await db.conference.findMany({
				where: {
					OR: query.participating
						? [
								{ conferenceSupervisors: { some: { userId } } },
								{ teamMembers: { some: { userId } } },
								{ singleParticipant: { some: { userId } } },
								{ delegations: { some: { members: { some: { userId } } } } }
							]
						: undefined,
					AND: [permissions.allowDatabaseAccessTo('list').Conference]
				}
			});
		},
		{
			query: t.Partial(t.Object({ participating: t.Boolean() })),
			response: t.Array(ConferencePlain)
		}
	)
	.get(
		'conference/:id/plausibility',
		async ({ params, permissions }) => {
			const user = permissions.mustBeLoggedIn();
			const conferenceId = params.id;

			await requireToBeConferenceAdmin({ conferenceId, user });

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
			findings.userFindings.dataMissing = dataMissing.filter(
				(u) => userDataCompleteCheck(u, 'de').length > 0
			);

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

			const { countdowns, registrationStatistics, ageStatistics } = await conferenceStats({
				db,
				conferenceId
			});

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
					average: t.Optional(t.Number()),
					distribution: t.Record(t.String(), t.Number())
				})
			})
		}
	);
