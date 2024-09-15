import { CRUDMaker } from '$api/util/crudmaker';
import Elysia, { t } from 'elysia';
import { db } from '$db/db';
import { permissionsPlugin } from '$api/auth/permissions';
import {
	RoleApplication,
	RoleApplicationPlain,
	RoleApplicationWhere
} from '$db/generated/schema/RoleApplication';

export const roleApplication = new Elysia()
	.use(CRUDMaker.getOne('roleApplication'))
	.use(permissionsPlugin)
	.get(
		'/roleApplication',
		async ({ permissions, query }) => {
			const roleApplications = await db.roleApplication.findMany({
				where: {
					delegationId: query.delegationId,
					AND: [permissions.allowDatabaseAccessTo('read').RoleApplication]
				},
				include: {
					nation: {
						where: {
							AND: [permissions.allowDatabaseAccessTo('read').Nation]
						}
					},
					nonStateActor: {
						where: {
							AND: [permissions.allowDatabaseAccessTo('read').NonStateActor]
						}
					},
					//TODO this does not perform an actual permission check on the delegation entity
					delegation: true
				},
				orderBy: {
					rank: 'asc'
				}
			});

			return roleApplications;
		},
		{
			query: t.Optional(t.Pick(RoleApplicationWhere, ['delegationId'])),
			response: t.Array(t.Omit(RoleApplication, ['delegation']))
		}
	)
	//TODO hier weiter
	.post(
		'/roleApplication',
		async ({ permissions, body }) => {
			const user = permissions.mustBeLoggedIn();

			const ranks = await db.roleApplication.findMany({
				where: {
					delegationId: body.delegationId
				},
				select: {
					rank: true
				}
			});

			const newRank = ranks.length + 1;

			return await db.roleApplication.create({
				data: {
					rank: newRank,
					nation: body.nationId
						? {
								connect: {
									alpha3Code: body.nationId
								}
							}
						: undefined,
					nonStateActor: body.nonStateActorId
						? {
								connect: {
									id: body.nonStateActorId
								}
							}
						: undefined,
					delegation: {
						connect: {
							id: body.delegationId
						}
					}
				}
			});
		},
		{
			body: t.Object({
				nationId: t.Optional(t.String()),
				nonStateActorId: t.Optional(t.String()),
				delegationId: t.String()
			}),
			response: RoleApplicationPlain
		}
	)
	.patch(
		'/roleApplication/:id/move',
		async ({ permissions, params, body }) => {
			const user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('update', 'RoleApplication'));

			const roleApplication = await db.roleApplication.findUniqueOrThrow({
				where: {
					id: params.id
				}
			});

			const roleApplications = await db.roleApplication.findMany({
				where: {
					delegationId: roleApplication.delegationId
				},
				orderBy: {
					rank: 'asc'
				}
			});

			const index = roleApplications.findIndex((ra) => ra.id === roleApplication.id);
			if (index === -1) {
				throw new Error('Role application not found');
			}

			const newIndex = body.direction === 'up' ? index - 1 : index + 1;
			if (newIndex < 0 || newIndex >= roleApplications.length) {
				throw new Error('Invalid move');
			}

			const otherRoleApplication = roleApplications[newIndex];

			await db.$transaction(async (db) => {
				await db.roleApplication.update({
					where: {
						id: roleApplication.id
					},
					data: {
						rank: otherRoleApplication.rank
					}
				});

				await db.roleApplication.update({
					where: {
						id: otherRoleApplication.id
					},
					data: {
						rank: roleApplication.rank
					}
				});
			});

			return true;
		},
		{
			params: t.Object({
				id: t.String()
			}),
			body: t.Object({
				direction: t.Union([t.Literal('up'), t.Literal('down')])
			})
		}
	)
	.use(CRUDMaker.updateOne('roleApplication'))
	.delete(
		'/roleApplication/:id',
		async ({ permissions, params }) => {
			const _user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('delete', 'RoleApplication'));

			await db.$transaction(async (db) => {
				const applicationToDelete = await db.roleApplication.findUniqueOrThrow({
					where: {
						id: params.id
					}
				});

				const roleApplicationsOfDelegation = await db.roleApplication.findMany({
					where: {
						delegationId: applicationToDelete.delegationId
					}
				});

				await db.roleApplication.delete({
					where: {
						id: params.id
					}
				});

				for (const ra of roleApplicationsOfDelegation) {
					if (ra.rank > applicationToDelete.rank) {
						await db.roleApplication.update({
							where: {
								id: ra.id
							},
							data: {
								rank: ra.rank - 1
							}
						});
					}
				}
			});

			return true;
		},
		{
			params: t.Object({
				id: t.String()
			})
		}
	);
