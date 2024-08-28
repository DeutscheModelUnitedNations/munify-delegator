import { permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { db } from '$db/db';
import {
	Delegation,
	DelegationInputCreate,
	DelegationPlain,
	DelegationWhereUnique
} from '$db/generated/schema/Delegation';
import Elysia, { t } from 'elysia';
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
			const user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('create', 'Delegation'));
			// https://github.com/CyberAP/nanoid-dictionary
			const entrycode = customAlphabet('6789BCDFGHJKLMNPQRTW', 6);

			return db.$transaction(async (tx) => {
				const delegation = await tx.delegation.create({
					data: { ...body, entryCode: entrycode() }
				});

				await tx.delegationMember.create({
					data: {
						conference: {
							connect: {
								id: delegation.conferenceId
							}
						},
						delegation: {
							connect: {
								id: delegation.id
							}
						},
						user: {
							connect: {
								id: user.sub
							}
						},
						isHeadDelegate: true
					}
				});

				return delegation;
			});
		},
		{
			body: DelegationInputCreate,
			response: DelegationPlain
		}
	)
	.post(
		`/delegation/join`,
		async ({ permissions, body }) => {
			const user = permissions.mustBeLoggedIn();
			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					entryCode: body.entryCode,
					AND: [permissions.allowDatabaseAccessTo('join').Delegation]
				}
			});

			if (body.joinAsSupervisor) {
				await db.conferenceSupervisor.upsert({
					create: {
						plansOwnAttendenceAtConference: false,
						conference: {
							connect: {
								id: delegation.conferenceId
							}
						},
						user: {
							connect: {
								id: user.sub
							}
						},
						delegations: {
							connect: {
								id: delegation.id
							}
						}
					},
					update: {
						delegations: {
							connect: {
								id: delegation.id
							}
						}
					},
					where: {
						conferenceId_userId: {
							conferenceId: delegation.conferenceId,
							userId: user.sub
						}
					}
				});
			} else {
				await db.delegationMember.create({
					data: {
						delegation: {
							connect: {
								id: delegation.id
							}
						},
						user: {
							connect: {
								id: user.sub
							}
						},
						isHeadDelegate: false,
						conference: {
							connect: {
								id: delegation.conferenceId
							}
						}
					}
				});
			}
		},
		{
			body: t.Composite([
				t.Required(t.Pick(DelegationWhereUnique, ['entryCode'])),
				t.Object({ joinAsSupervisor: t.Boolean({ default: false }) })
			])
		}
	);
