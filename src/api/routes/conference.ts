import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissions';
import { ConferencePlain } from '$db/generated/schema/Conference';
import { UserPlain } from '$db/generated/schema/User';
import type { User } from '@prisma/client';

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
	);
