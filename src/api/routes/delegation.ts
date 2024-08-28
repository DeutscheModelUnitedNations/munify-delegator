import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import {
	DelegationInputCreate,
	DelegationPlain,
} from '$db/generated/schema/Delegation';
import Elysia from 'elysia';
import { customAlphabet } from 'nanoid';

export const delegation = new Elysia()
	.use(CRUDMaker.getAll('delegation'))
	.use(CRUDMaker.getOne('delegation'))
	.use(CRUDMaker.updateOne('delegation'))
	.use(CRUDMaker.deleteOne('delegation'))
	.use(permissionsPlugin)
	.post(
		`/delegation`,
		async ({ permissions, body }) => {
			permissions.checkIf((user) => user.can('create', 'Delegation'));
			// https://github.com/CyberAP/nanoid-dictionary
			const entrycode = customAlphabet('6789BCDFGHJKLMNPQRTW', 6);
			return await db.delegation.create({
				data: { ...body, entryCode: entrycode() }
			});
		},
		{
			body: DelegationInputCreate,
			response: DelegationPlain
		}
	);
