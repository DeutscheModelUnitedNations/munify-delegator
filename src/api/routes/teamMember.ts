import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const teamMember = new Elysia()
	.use(CRUDMaker.getAll('teamMember'))
	.use(CRUDMaker.getOne('teamMember'))
	.use(CRUDMaker.createOne('teamMember'))
	.use(CRUDMaker.updateOne('teamMember'))
	.use(CRUDMaker.deleteOne('teamMember'));
