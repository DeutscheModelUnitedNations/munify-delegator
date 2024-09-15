import { PermissionCheckError, permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import { SingleParticipantInputCreate } from '$db/generated/schema/SingleParticipant';
import Elysia, { t } from 'elysia';

export const singleParticipant = new Elysia()
	.use(CRUDMaker.getAll('singleParticipant'))
	.use(CRUDMaker.getOne('singleParticipant'))
	.use(CRUDMaker.createOne('singleParticipant'))
	.use(CRUDMaker.updateOne('singleParticipant'))
	.use(CRUDMaker.deleteOne('singleParticipant'))
	.use(permissionsPlugin)
	.post(
		'/singleParticipant/add-self-application',
		async ({ body, permissions }) => {
			const user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('create', 'SingleParticipant'));

			// is the user part of a delegation in this conference?
			const foundMember = await db.delegationMember.findFirst({
				where: {
					conferenceId: body.conference.connect.id,
					user: {
						id: user.sub
					}
				}
			});

			if (foundMember) {
				throw new PermissionCheckError('You are already a delegation member in this conference');
			}

			const foundSupervisor = await db.conferenceSupervisor.findFirst({
				where: {
					conferenceId: body.conference.connect.id,
					user: {
						id: user.sub
					}
				}
			});

			if (foundSupervisor) {
				throw new PermissionCheckError('You are already a supervisor in this conference');
			}

			return await db.singleParticipant.upsert({
				where: {
					conferenceId_userId: {
						conferenceId: body.conference.connect.id,
						userId: user.sub!
					}
				},
				create: {
					...body,
					applied: false,
					user: {
						connect: {
							id: user.sub
						}
					}
				},
				update: {
					...body,
					applied: false,
					user: {
						connect: {
							id: user.sub
						}
					}
				}
			});
		},
		{
			body: t.Required(t.Omit(SingleParticipantInputCreate, ['applied', 'user']))
		}
	);
