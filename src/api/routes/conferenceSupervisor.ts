import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import {
	ConferenceSupervisor,
	ConferenceSupervisorPlain
} from '$db/generated/schema/ConferenceSupervisor';
import { DelegationPlain } from '$db/generated/schema/Delegation';
import Elysia, { t } from 'elysia';

export const conferenceSupervisor = new Elysia()
	.use(permissionsPlugin)
	.get(
		'/conferenceSupervisor',
		async ({ permissions, query }) => {
			const user = await permissions.mustBeLoggedIn();

			return await db.conferenceSupervisor.findMany({
				where: {
					OR: [
						{
							delegations: {
								some: {
									id: query.delegationId
								}
							}
						},
						{
							conference: {
								id: query.conferenceId
							}
						}
					]
				},
				include: {
					user: {
						select: {
							id: true,
							given_name: true,
							family_name: true
						}
					},
					_count: {
						select: {
							delegations: true
						}
					}
				}
			});
		},
		{
			query: t.Optional(
				t.Object({
					delegationId: t.Optional(t.String()),
					conferenceId: t.Optional(t.String())
				})
			),
			response: t.Array(
				t.Composite([
					ConferenceSupervisorPlain,
					t.Object({
						user: t.Object({
							id: t.String(),
							given_name: t.String(),
							family_name: t.String()
						})
					}),
					t.Object({
						_count: t.Object({
							delegations: t.Number()
						})
					})
				])
			)
		}
	)
	.use(CRUDMaker.getOne('conferenceSupervisor'))
	.get(
		'/conferenceSupervisor/mine/:conferenceId',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();
			return db.conferenceSupervisor.findUniqueOrThrow({
				where: {
					conferenceId_userId: {
						conferenceId: params.conferenceId,
						userId: user.sub!
					}
				},
				include: {
					delegations: {
						select: {
							id: true
						}
					}
				}
			});
		},
		{
			response: t.Composite([
				ConferenceSupervisorPlain,
				t.Object({
					delegations: t.Array(t.Pick(DelegationPlain, ['id']))
				})
			])
		}
	)
	.use(CRUDMaker.createOne('conferenceSupervisor'))
	.use(CRUDMaker.updateOne('conferenceSupervisor'))
	.use(CRUDMaker.deleteOne('conferenceSupervisor'));
