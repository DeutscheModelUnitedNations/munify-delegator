import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { CRUDMaker } from '$api/util/crudmaker';
import { fetchUserParticipations } from '$api/util/fetchUserParticipations';
import { UserFacingError } from '$api/util/logger';
import { db } from '$db/db';
import { CustomConferenceRolePlain } from '$db/generated/schema/CustomConferenceRole';
import {
	SingleParticipantInputCreate,
	SingleParticipantPlain
} from '$db/generated/schema/SingleParticipant';
import Elysia, { t } from 'elysia';

export const singleParticipant = new Elysia()
	.use(CRUDMaker.getOne('singleParticipant'))
	.use(CRUDMaker.createOne('singleParticipant'))
	.use(CRUDMaker.updateOne('singleParticipant'))
	.use(CRUDMaker.deleteOne('singleParticipant'))
	.use(permissionsPlugin)
	.get(
		`/singleParticipant`,
		async ({ permissions, params, query }) => {
			return await db.singleParticipant.findMany({
				where: {
					conferenceId: query.conferenceId,
					userId: query.userId,
					AND: [permissions.allowDatabaseAccessTo('read').SingleParticipant]
				}
			});
		},
		{
			query: t.Optional(
				t.Partial(
					t.Object({
						conferenceId: t.String(),
						userId: t.String()
					})
				)
			),
			response: t.Array(SingleParticipantPlain)
		}
	)
	.post(
		'/singleParticipant/add-self-application',
		async ({ body, permissions }) => {
			const user = permissions.mustBeLoggedIn();

			const { foundDelegationMember, foundSupervisor, foundTeamMember } =
				await fetchUserParticipations({
					conferenceId: body.conference.connect.id,
					userId: user.sub
				});

			if (foundDelegationMember || foundSupervisor || foundTeamMember) {
				throw new UserFacingError(
					"You can't apply as a single participant if you already are a part of this conference!"
				);
			}

			return await db.singleParticipant.upsert({
				where: {
					conferenceId_userId: {
						conferenceId: body.conference.connect.id,
						userId: user.sub!
					},
					applied: false
				},
				create: {
					...body,
					applied: false,
					user: {
						connect: {
							id: user.sub
						}
					}
				},
				update: {
					...body,
					applied: false,
					user: {
						connect: {
							id: user.sub
						}
					}
				}
			});
		},
		{
			body: t.Required(t.Omit(SingleParticipantInputCreate, ['applied', 'user']))
		}
	)

	.get(
		'/singleParticipant/mine/:conferenceId',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();
			return await db.singleParticipant.findUniqueOrThrow({
				where: {
					conferenceId_userId: {
						userId: user.sub,
						conferenceId: params.conferenceId
					},
					AND: [permissions.allowDatabaseAccessTo('read').SingleParticipant]
				},
				include: {
					appliedForRoles: true
				}
			});
		},
		{
			params: t.Object({
				conferenceId: t.String()
			}),
			response: t.Composite([
				SingleParticipantPlain,
				t.Object({ appliedForRoles: t.Array(CustomConferenceRolePlain) })
			])
		}
	)

	.delete(
		'/singleParticipant/:id/deleteApplication/:roleApplicationId',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();

			await db.singleParticipant.update({
				where: {
					id: params.id,
					AND: [permissions.allowDatabaseAccessTo('update').SingleParticipant]
				},
				data: {
					appliedForRoles: {
						disconnect: {
							id: params.roleApplicationId
						}
					}
				}
			});

			return { success: true };
		},
		{
			params: t.Object({
				id: t.String(),
				roleApplicationId: t.String()
			})
		}
	)

	.patch('/singleParticipant/:id/completeRegistration', async ({ permissions, params }) => {
		const singleParticipant = await db.singleParticipant.findUniqueOrThrow({
			where: {
				id: params.id,
				AND: [permissions.allowDatabaseAccessTo('update').SingleParticipant]
			},
			include: {
				appliedForRoles: {
					where: {
						AND: [permissions.allowDatabaseAccessTo('read').CustomConferenceRole]
					}
				}
			}
		});

		if (singleParticipant.appliedForRoles.length < 1) {
			throw new UserFacingError('Not enough role applications');
		}

		if (
			!singleParticipant.school ||
			!singleParticipant.experience ||
			!singleParticipant.motivation
		) {
			throw new UserFacingError('Missing information');
		}

		await db.singleParticipant.update({
			where: {
				id: params.id
			},
			data: {
				applied: true
			}
		});
	});
