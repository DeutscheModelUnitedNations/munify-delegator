import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { ConferencePlain } from '$db/prismabox/Conference';
import { permissionsPlugin } from '$api/auth/permissions';

export const conference = new Elysia({ normalize: true }).use(permissionsPlugin).get(
	'/conference',
	async ({ permissions }) => {
		return db.conference.findMany();
		// return db.conference.findMany({ where: permissions.allowDatabaseAccessTo('list').Conference });
	},
	{
		response: t.Array(ConferencePlain)
	}
);
