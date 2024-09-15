import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissions';

export const delegationMember = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getAll('delegationMember'))
	.use(CRUDMaker.getOne('delegationMember'));
// these are currently managed mostly by the delegation routes
// .use(CRUDMaker.createOne('delegationMember'))
// .use(CRUDMaker.updateOne('delegationMember'));
