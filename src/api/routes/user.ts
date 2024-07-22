import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { UserPlain } from '$db/generated/schema/User';
import { permissionsPlugin } from '$api/auth/permissions';

export const user = new Elysia()
	.use(permissionsPlugin)
	.get(
		'/user',
		async ({ permissions }) => {
			return db.user.findMany({ where: permissions.allowDatabaseAccessTo('list').User });
		},
		{
			response: t.Array(UserPlain)
		}
	)
	.put(
		'/user/upsert-after-login',
		async ({ permissions }) => {
			const user = permissions.mustBeLoggedIn();

			if (!user.email || !user.family_name || !user.given_name || !user.preferred_username) {
				throw new Error('Missing required fields');
			}

			return db.user.upsert({
				where: { id: user.sub },
				create: {
					id: user.sub,
					email: user.email,
					family_name: user.family_name,
					given_name: user.given_name,
					preferred_username: user.preferred_username,
					locale: user.locale ?? 'de'
				},
				update: {
					email: user.email,
					family_name: user.family_name,
					given_name: user.given_name,
					preferred_username: user.preferred_username,
					locale: user.locale ?? 'de'
				}
			});
		},
		{
			response: UserPlain
		}
	);
