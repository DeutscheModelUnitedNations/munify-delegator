import { CRUDMaker } from '$api/util/crudmaker';
import Elysia from 'elysia';

export const conferenceParticipantStatus = new Elysia()
	.use(CRUDMaker.getAll('conferenceParticipantStatus'))
	.use(CRUDMaker.getOne('conferenceParticipantStatus'))
	.use(CRUDMaker.createOne('conferenceParticipantStatus'))
	.use(CRUDMaker.updateOne('conferenceParticipantStatus'))
	.use(CRUDMaker.deleteOne('conferenceParticipantStatus'));
