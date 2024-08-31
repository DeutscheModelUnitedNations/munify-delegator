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

const makeEntryCode = customAlphabet('6789BCDFGHJKLMNPQRTW', 6);

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

			return db.$transaction(async (tx) => {
				const delegation = await tx.delegation.create({
					data: { ...body, entryCode: makeEntryCode() }
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
	)
	.get(
		`/delegation/preview`,
		async ({ permissions, query }) => {
			permissions.mustBeLoggedIn();
			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					conferenceId: query.conferenceId,
					entryCode: query.entryCode
				},
				include: {
					conference: {
						select: {
							title: true
						}
					},
					_count: {
						select: { members: true }
					},
					members: {
						where: {
							isHeadDelegate: true
						},
						include: {
							user: {
								select: {
									given_name: true,
									family_name: true
								}
							}
						}
					}
				}
			});

			//TODO we should include the info if the user is already a member here and display it in the frontend
			return {
				id: delegation.id,
				conferenceId: delegation.conferenceId,
				entryCode: delegation.entryCode,
				motivation: delegation.motivation,
				school: delegation.school,
				experience: delegation.experience,
				memberCount: delegation._count.members,
				headDelegateFullName: `${delegation.members[0].user.given_name} ${delegation.members[0].user.family_name}`,
				applied: delegation.applied,
				conferenceTitle: delegation.conference.title
			};
		},
		{
			query: t.Object({ entryCode: t.String(), conferenceId: t.String() }),
			response: t.Composite([
				DelegationPlain,
				t.Object({
					memberCount: t.Number(),
					headDelegateFullName: t.String(),
					conferenceTitle: t.String()
				})
			])
		}
	)
	.patch(
		`/delegation/:id/resetEntryCode`,
		async ({ permissions, params }) => {
			return await db.delegation.update({
				where: {
					id: params.id,
					AND: [permissions.allowDatabaseAccessTo('update').Delegation]
				},
				data: {
					entryCode: makeEntryCode()
				}
			});
		},
		{
			body: t.Object({ newEntryCode: t.Index(Delegation, ['entryCode']) }),
			response: DelegationPlain
		}
	);
