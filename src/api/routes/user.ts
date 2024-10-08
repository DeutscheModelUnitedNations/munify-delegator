import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { User, UserPlain } from '$db/generated/schema/User';
import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { CRUDMaker } from '$api/util/crudmaker';
import { dynamicPublicConfig } from '$config/public';
import { requireToBeConferenceAdmin } from '$api/auth/helper/requireUserToBeConferenceAdmin';

export const user = new Elysia({
	normalize: true
})
	.use(CRUDMaker.getAll('user'))
	.use(CRUDMaker.createOne('user'))
	.use(CRUDMaker.updateOne('user'))
	.use(CRUDMaker.deleteOne('user'))
	.use(permissionsPlugin)
	.get(
		'/user/:id',
		async ({ params, permissions }) => {
			return db.user.findUniqueOrThrow({
				where: { id: params.id },
				include: {
					delegationMemberships: {
						where: permissions.allowDatabaseAccessTo('read').DelegationMember
					},
					singleParticipant: {
						where: permissions.allowDatabaseAccessTo('read').SingleParticipant
					},
					conferenceParticipantStatus: {
						where: permissions.allowDatabaseAccessTo('read').ConferenceParticipantStatus
					},
					conferenceSupervisor: {
						where: permissions.allowDatabaseAccessTo('read').ConferenceSupervisor
					},
					teamMember: {
						where: permissions.allowDatabaseAccessTo('read').TeamMember
					}
				}
			});
		},
		{
			response: User
		}
	)
	.patch(
		'/user/upsert-after-login',
		async ({ permissions }) => {
			const user = permissions.mustBeLoggedIn();

			if (!user.email || !user.family_name || !user.given_name || !user.preferred_username) {
				throw new Error('OIDC result is missing required fields!');
			}

			const updatedUser = await db.user.upsert({
				where: { id: user.sub },
				create: {
					id: user.sub,
					email: user.email,
					family_name: user.family_name,
					given_name: user.given_name,
					preferred_username: user.preferred_username,
					locale: user.locale ?? dynamicPublicConfig.DEFAULT_LOCALE,
					phone: user.phone
				},
				update: {
					email: user.email,
					family_name: user.family_name,
					given_name: user.given_name,
					preferred_username: user.preferred_username,
					locale: user.locale ?? dynamicPublicConfig.DEFAULT_LOCALE,
					phone: user.phone
				}
			});

			const requiredFields: (keyof typeof updatedUser)[] = [
				'birthday',
				'phone',
				'street',
				'zip',
				'city',
				'country',
				'gender',
				'foodPreference'
			];

			const userNeedsAdditionalInfo = requiredFields.some((field) => !updatedUser[field]);

			return { userNeedsAdditionalInfo };
		},
		{
			response: t.Object({ userNeedsAdditionalInfo: t.Boolean() })
		}
	)
	.get(
		'/user/perConference/:conferenceId',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();

			await requireToBeConferenceAdmin({ conferenceId: params.conferenceId, user: user });

			return await db.user.findMany({
				where: {
					OR: [
						{
							delegationMemberships: {
								some: {
									conferenceId: params.conferenceId
								}
							}
						},
						{
							singleParticipant: {
								some: {
									conferenceId: params.conferenceId
								}
							}
						},
						{
							conferenceSupervisor: {
								some: {
									conferenceId: params.conferenceId
								}
							}
						}
					]
				},
				include: {
					delegationMemberships: {
						where: {
							conferenceId: params.conferenceId
						},
						select: {
							id: true,
							delegationId: true
						}
					},
					singleParticipant: {
						where: {
							conferenceId: params.conferenceId
						},
						select: {
							id: true
						}
					},
					conferenceSupervisor: {
						where: {
							conferenceId: params.conferenceId
						},
						select: {
							id: true
						}
					}
				}
			});
		},
		{
			response: t.Array(
				t.Composite([
					UserPlain,
					t.Object({
						delegationMemberships: t.Array(t.Object({ id: t.String(), delegationId: t.String() })),
						singleParticipant: t.Array(t.Object({ id: t.String() })),
						conferenceSupervisor: t.Array(t.Object({ id: t.String() }))
					})
				])
			)
		}
	);
