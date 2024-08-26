import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const singleParticipant = new Elysia()
	.use(CRUDMaker.getAll('singleParticipant'))
	.use(CRUDMaker.getOne('singleParticipant'))
	.use(CRUDMaker.createOne('singleParticipant'))
	.use(CRUDMaker.updateOne('singleParticipant'))
	.use(CRUDMaker.deleteOne('singleParticipant'));
