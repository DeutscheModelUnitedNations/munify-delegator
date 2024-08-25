import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const delegation = new Elysia()
	.use(CRUDMaker.getAll('delegation'))
	.use(CRUDMaker.getOne('delegation'))
	.use(CRUDMaker.createOne('delegation'))
	.use(CRUDMaker.updateOne('delegation'))
	.use(CRUDMaker.deleteOne('delegation'));
