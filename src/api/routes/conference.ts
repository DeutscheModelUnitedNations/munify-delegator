import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';

export const conference = new Elysia()
	.use(CRUDMaker.getAll('conference'))
	.use(CRUDMaker.getOne('conference'))
	.use(CRUDMaker.createOne('conference'))
	.use(CRUDMaker.updateOne('conference'))
	.use(CRUDMaker.deleteOne('conference'));
