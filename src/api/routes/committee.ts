import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const committee = new Elysia()
	.use(CRUDMaker.getAll('committee'))
	.use(CRUDMaker.getOne('committee'))
	.use(CRUDMaker.createOne('committee'))
	.use(CRUDMaker.updateOne('committee'))
	.use(CRUDMaker.deleteOne('committee'));
