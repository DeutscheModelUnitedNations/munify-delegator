import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { ConferencePlain } from '$db/generated/schema/Conference';
import { permissionsPlugin } from '$api/auth/permissions';

export const conference = new Elysia().use(permissionsPlugin).get(
	'/conference',
	async ({ permissions }) => {
		return db.conference.findMany({ where: permissions.allowDatabaseAccessTo('list').Conference });
	},
	{
		response: t.Array(ConferencePlain)
	}
);
