import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { DelegationMemberPlain } from '$db/generated/schema/DelegationMember';

export const delegationMember = new Elysia()
	.use(permissionsPlugin)
	.get(
		'/delegationMember',
		async ({ permissions, query }) => {
			return await db.delegationMember.findMany({
				where: {
					delegationId: query.delegationId,
					conferenceId: query.conferenceId,
					userId: query.userId,
					AND: [permissions.allowDatabaseAccessTo('read').DelegationMember]
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
				t.Partial(
					t.Object({
						delegationId: t.String(),
						conferenceId: t.String(),
						userId: t.String()
					})
				)
			),
			response: t.Array(
				t.Composite([
					DelegationMemberPlain,
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
	.use(CRUDMaker.getOne('delegationMember'))
	.use(CRUDMaker.deleteOne('delegationMember'));
// these are currently managed mostly by the delegation routes
// .use(CRUDMaker.createOne('delegationMember'))
// .use(CRUDMaker.updateOne('delegationMember'));
