import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { ConferencePlain } from '$db/generated/schema/Conference';

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
	);
