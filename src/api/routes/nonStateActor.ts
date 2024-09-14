import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import { NonStateActorPlain } from '$db/generated/schema/NonStateActor';
import Elysia, { t } from 'elysia';

export const nonStateActor = new Elysia()
	.use(permissionsPlugin)
	.get(
		'/nonStateActor',
		async ({ permissions, query }) => {
			return await db.nonStateActor.findMany({
				where: {
					...(query ?? {}),
					AND: [permissions.allowDatabaseAccessTo('list').NonStateActor]
				}
			});
		},
		{
			query: t.Optional(t.Object({ conferenceId: t.String() })),
			response: t.Array(NonStateActorPlain)
		}
	)
	.use(CRUDMaker.getOne('nonStateActor'))
	.use(CRUDMaker.createOne('nonStateActor'))
	.use(CRUDMaker.updateOne('nonStateActor'))
	.use(CRUDMaker.deleteOne('nonStateActor'));
