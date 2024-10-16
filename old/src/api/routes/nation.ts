import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const nation = new Elysia()
	.use(CRUDMaker.getAll('nation'))
	.use(CRUDMaker.getOne('nation'))
	.use(CRUDMaker.createOne('nation'))
	.use(CRUDMaker.updateOne('nation'))
	.use(CRUDMaker.deleteOne('nation'));
