import { permissionsPlugin } from '$api/auth/permissions';
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
					delegations: {
						some: {
							id: query.delegationId
						}
					}
				},
				include: {
					user: {
						select: {
							id: true,
							given_name: true,
							family_name: true
						}
					}
				}
			});
		},
		{
			query: t.Optional(
				t.Object({
					delegationId: t.String()
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
