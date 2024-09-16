import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { fetchUserParticipations } from '$api/util/fetchUserParticipations';
import { UserFacingError } from '$api/util/logger';
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

			const { foundDelegationMember, foundSupervisor, foundTeamMember } =
				await fetchUserParticipations({
					conferenceId: body.conference.connect.id,
					userId: user.sub
				});

			if (foundDelegationMember || foundSupervisor || foundTeamMember) {
				throw new UserFacingError(
					"You can't apply as a single participant if you already are a part of this conference!"
				);
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
