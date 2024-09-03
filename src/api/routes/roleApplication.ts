import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissions';

export const roleApplication = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getAll('roleApplication'))
	.get('/roleApplication/byDelegation/:delegationId', async ({ permissions, params }) => {
		const user = permissions.mustBeLoggedIn();

		const roleApplications = await db.roleApplication.findMany({
			where: {
				delegationId: params.delegationId
			},
			include: {
				nation: true,
				nonStateActor: true
			},
			orderBy: {
				rank: 'asc'
			}
		});

		return roleApplications;
	})
	.use(CRUDMaker.getOne('roleApplication'))
	.use(CRUDMaker.createOne('roleApplication'))
	.use(CRUDMaker.updateOne('roleApplication'))
	.use(CRUDMaker.deleteOne('roleApplication'));
