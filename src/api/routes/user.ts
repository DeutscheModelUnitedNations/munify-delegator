import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { UserPlain } from '$db/generated/schema/User';
import { permissionsPlugin } from '$api/auth/permissions';
import { makeCRUD } from '$api/util/crudmaker';

export const user = new Elysia()
	.use(permissionsPlugin)
	.use(makeCRUD('user'))
	.patch(
		'/user/upsert-after-login',
		async ({ permissions }) => {
			const user = permissions.mustBeLoggedIn();

			if (!user.email || !user.family_name || !user.given_name || !user.preferred_username) {
				throw new Error('OIDC result is missing required fields!');
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
