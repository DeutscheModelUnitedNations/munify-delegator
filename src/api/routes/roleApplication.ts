import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const roleApplication = new Elysia()
	.use(CRUDMaker.getAll('roleApplication'))
	.use(CRUDMaker.getOne('roleApplication'))
	.use(CRUDMaker.createOne('roleApplication'))
	.use(CRUDMaker.updateOne('roleApplication'))
	.use(CRUDMaker.deleteOne('roleApplication'));
