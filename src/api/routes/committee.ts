import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { Committee } from '$db/generated/schema/Committee';

export const committee = new Elysia()
	.use(CRUDMaker.getOne('committee'))
	.use(CRUDMaker.createOne('committee'))
	.use(CRUDMaker.updateOne('committee'))
	.use(CRUDMaker.deleteOne('committee'))
	.use(permissionsPlugin)
	.get(
		'/committee',
		async ({ query, permissions }) => {
			return await db.committee.findMany({
				where: {
					conferenceId: query.conferenceId,
					AND: [permissions.allowDatabaseAccessTo('list').Committee]
				},
				include: {
					nations: {
						where: permissions.allowDatabaseAccessTo('list').Nation
					}
				}
			});
		},
		{
			query: t.Optional(t.Partial(t.Object({ conferenceId: t.String() }))),
			response: t.Array(t.Omit(Committee, ['conference']))
		}
	);
