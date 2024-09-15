import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import { NonStateActorPlain } from '$db/generated/schema/NonStateActor';
import Elysia, { t } from 'elysia';

export const nonStateActor = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getAll('nonStateActor'))
	.use(CRUDMaker.getOne('nonStateActor'))
	.use(CRUDMaker.createOne('nonStateActor'))
	.use(CRUDMaker.updateOne('nonStateActor'))
	.use(CRUDMaker.deleteOne('nonStateActor'));
