import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const customConferenceRole = new Elysia()
	.use(CRUDMaker.getAll('customConferenceRole'))
	.use(CRUDMaker.getOne('customConferenceRole'))
	.use(CRUDMaker.createOne('customConferenceRole'))
	.use(CRUDMaker.updateOne('customConferenceRole'))
	.use(CRUDMaker.deleteOne('customConferenceRole'));
