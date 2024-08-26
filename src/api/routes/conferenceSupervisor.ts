import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const conferenceSupervisor = new Elysia()
	.use(CRUDMaker.getAll('conferenceSupervisor'))
	.use(CRUDMaker.getOne('conferenceSupervisor'))
	.use(CRUDMaker.createOne('conferenceSupervisor'))
	.use(CRUDMaker.updateOne('conferenceSupervisor'))
	.use(CRUDMaker.deleteOne('conferenceSupervisor'));
