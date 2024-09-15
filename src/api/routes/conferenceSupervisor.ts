import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import {
	ConferenceSupervisor,
	ConferenceSupervisorPlain
} from '$db/generated/schema/ConferenceSupervisor';
import { DelegationPlain } from '$db/generated/schema/Delegation';
import Elysia, { t } from 'elysia';

export const conferenceSupervisor = new Elysia()
	.use(permissionsPlugin)
	.use(CRUDMaker.getAll('conferenceSupervisor'))
	.use(CRUDMaker.getOne('conferenceSupervisor'))
	.get('/conferenceSupervisor/mine', async ({ permissions }) => {
		const user = permissions.mustBeLoggedIn();
		return db.conferenceSupervisor.findMany({
			where: {
				userId: user.sub
			}
		});
	})
	.get(
		'/conferenceSupervisor/mine/:conferenceId',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();
			return db.conferenceSupervisor.findUniqueOrThrow({
				where: {
					conferenceId_userId: {
						conferenceId: params.conferenceId,
						userId: user.sub!
					}
				},
				include: {
					delegations: {
						select: {
							id: true
						}
					}
				}
			});
		},
		{
			response: t.Composite([
				ConferenceSupervisorPlain,
				t.Object({
					delegations: t.Array(t.Pick(DelegationPlain, ['id']))
				})
			])
		}
	)
	.use(CRUDMaker.createOne('conferenceSupervisor'))
	.use(CRUDMaker.updateOne('conferenceSupervisor'))
	.use(CRUDMaker.deleteOne('conferenceSupervisor'));
