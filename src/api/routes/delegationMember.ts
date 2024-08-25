import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const delegationMember = new Elysia()
	.use(CRUDMaker.getAll('delegationMember'))
	.use(CRUDMaker.getOne('delegationMember'))
	.use(CRUDMaker.createOne('delegationMember'))
	.use(CRUDMaker.updateOne('delegationMember'))
	.use(CRUDMaker.deleteOne('delegationMember'));
