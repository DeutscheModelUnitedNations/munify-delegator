import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import { CustomConferenceRolePlain } from '$db/generated/schema/CustomConferenceRole';
import Elysia, { t } from 'elysia';

export const customConferenceRole = new Elysia()
	.use(permissionsPlugin)
	.get(
		'/customConferenceRole',
		async ({ permissions, query }) => {
			return await db.customConferenceRole.findMany({
				where: {
					...(query ?? {}),
					AND: [permissions.allowDatabaseAccessTo('list').CustomConferenceRole]
				}
			});
		},
		{
			query: t.Optional(t.Object({ conferenceId: t.String() })),
			response: t.Array(CustomConferenceRolePlain)
		}
	)
	.use(CRUDMaker.getOne('customConferenceRole'))
	.use(CRUDMaker.createOne('customConferenceRole'))
	.use(CRUDMaker.updateOne('customConferenceRole'))
	.use(CRUDMaker.deleteOne('customConferenceRole'));
