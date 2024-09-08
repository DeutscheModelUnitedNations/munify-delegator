import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissions';

export const delegationMember = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getAll('delegationMember'))
	.use(CRUDMaker.getOne('delegationMember'))
	.use(CRUDMaker.createOne('delegationMember'))
	.use(CRUDMaker.updateOne('delegationMember'))
	.use(CRUDMaker.deleteOne('delegationMember'))
	.delete(
		'/delegationMember',
		async ({ permissions, body }) => {
			const user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('delete', 'DelegationMember'));

			const delegationMember = await db.delegationMember.findUniqueOrThrow({
				where: {
					delegationId_userId: {
						delegationId: body.delegationId,
						userId: body.userId
					}
				}
			});

			await db.delegationMember.delete({
				where: {
					id: delegationMember.id
				}
			});

			return true;
		},
		{
			body: t.Object({
				userId: t.String(),
				delegationId: t.String()
			})
		}
	);
