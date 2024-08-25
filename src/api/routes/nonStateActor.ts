import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const nonStateActor = new Elysia()
	.use(CRUDMaker.getAll('nonStateActor'))
	.use(CRUDMaker.getOne('nonStateActor'))
	.use(CRUDMaker.createOne('nonStateActor'))
	.use(CRUDMaker.updateOne('nonStateActor'))
	.use(CRUDMaker.deleteOne('nonStateActor'));
