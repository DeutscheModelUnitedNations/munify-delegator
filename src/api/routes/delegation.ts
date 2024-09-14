import { PermissionCheckError, permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { removeTooSmallRoleApplications } from '$api/util/removeTooSmallRoleApplications';
import { db } from '$db/db';
import { ConferenceSupervisorPlain } from '$db/generated/schema/ConferenceSupervisor';
import {
	Delegation,
	DelegationInputCreate,
	DelegationPlain,
	DelegationWhereUnique
} from '$db/generated/schema/Delegation';
import { DelegationMemberPlain } from '$db/generated/schema/DelegationMember';
import { RoleApplication, RoleApplicationPlain } from '$db/generated/schema/RoleApplication';
import Elysia, { t } from 'elysia';
import { customAlphabet } from 'nanoid';

const makeEntryCode = customAlphabet('6789BCDFGHJKLMNPQRTW', 6);

export const delegation = new Elysia()
	.use(CRUDMaker.getAll('delegation'))
	.use(CRUDMaker.updateOne('delegation'))
	.use(CRUDMaker.deleteOne('delegation'))
	.use(permissionsPlugin)
	.get(
		'delegation/:id',
		async ({ permissions, params }) => {
			const _user = permissions.mustBeLoggedIn();

			await removeTooSmallRoleApplications(params.id);

			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					id: params.id,
					AND: [permissions.allowDatabaseAccessTo('read').Delegation]
				},
				include: {
					members: {
						include: {
							user: {
								select: {
									id: true,
									given_name: true,
									family_name: true,
									email: true,
									pronouns: true
								}
							}
						}
					},
					appliedForRoles: {
						include: {
							nation: true,
							nonStateActor: true
						}
					},
					supervisors: {
						include: {
							user: {
								select: {
									id: true,
									given_name: true,
									family_name: true,
									email: true,
									pronouns: true
								}
							}
						}
					}
				}
			});

			return delegation;
		},
		{
			response: t.Composite([
				DelegationPlain,
				t.Object({ appliedForRoles: t.Array(t.Omit(RoleApplication, ['delegation'])) }),
				t.Object({
					supervisors: t.Array(
						t.Composite([
							ConferenceSupervisorPlain,
							t.Object({
								user: t.Object({
									id: t.String(),
									given_name: t.String(),
									family_name: t.String(),
									email: t.String(),
									pronouns: t.Nullable(t.String())
								})
							})
						])
					)
				}),
				t.Object({
					members: t.Array(
						t.Composite([
							DelegationMemberPlain,
							t.Object({
								user: t.Object({
									id: t.String(),
									given_name: t.String(),
									family_name: t.String(),
									email: t.String(),
									pronouns: t.Nullable(t.String())
								})
							})
						])
					)
				})
			])
		}
	)
	.post(
		`/delegation`,
		async ({ permissions, body }) => {
			const user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('create', 'Delegation'));
			// https://github.com/CyberAP/nanoid-dictionary

			//TODO these checks should appear in the abilities

			const foundSupervisor = await db.conferenceSupervisor.findFirst({
				where: {
					conferenceId: body.conference.connect.id,
					user: {
						id: user.sub
					}
				}
			});

			//TODO these checks appear in multiple handlers (see singleParticipant routes)
			// we should probably find a way to handle this via the CASL rules?
			if (foundSupervisor) {
				throw new PermissionCheckError('You are already a supervisor in this conference');
			}

			const foundSingleParticipant = await db.singleParticipant.findFirst({
				where: {
					user: {
						id: user.sub
					},
					conference: {
						id: body.conference.connect.id
					}
				}
			});

			if (foundSingleParticipant) {
				throw new PermissionCheckError('You are already a single participant in this conference');
			}

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
				const foundDelegationMember = await db.delegationMember.findFirst({
					where: {
						user: {
							id: user.sub
						},
						conference: {
							id: delegation.conferenceId
						}
					}
				});

				if (foundDelegationMember) {
					throw new PermissionCheckError('You are already a delegation member in this conference');
				}

				const foundSingleParticipant = await db.singleParticipant.findFirst({
					where: {
						user: {
							id: user.sub
						},
						conference: {
							id: delegation.conferenceId
						}
					}
				});

				if (foundSingleParticipant) {
					throw new PermissionCheckError('You are already a single participant in this conference');
				}

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
				const foundDelegationMember = await db.delegationMember.findFirst({
					where: {
						user: {
							id: user.sub
						},
						conference: {
							id: delegation.conferenceId
						}
					}
				});

				if (foundDelegationMember) {
					throw new PermissionCheckError('You are already a delegation member in this conference');
				}

				const foundSingleParticipant = await db.singleParticipant.findFirst({
					where: {
						user: {
							id: user.sub
						},
						conference: {
							id: delegation.conferenceId
						}
					}
				});

				if (foundSingleParticipant) {
					throw new PermissionCheckError('You are already a single participant in this conference');
				}

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

			await removeTooSmallRoleApplications(delegation.id);
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
				headDelegateFullName: `${delegation.members.find((x) => x.isHeadDelegate)?.user.given_name} ${delegation.members.find((x) => x.isHeadDelegate)?.user.family_name}`,
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
	)
	.patch(
		'/delegation/:id/transferHeadDelegateship',
		async ({ permissions, params, body }) => {
			const user = permissions.mustBeLoggedIn();
			permissions.checkIf((user) => user.can('update', 'Delegation'));

			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					id: params.id
				},
				include: {
					members: true
				}
			});

			await db.$transaction(async (tx) => {
				await tx.delegationMember.update({
					where: {
						delegationId_userId: {
							delegationId: delegation.id,
							userId: user.sub
						}
					},
					data: {
						isHeadDelegate: false
					}
				});

				await tx.delegationMember.update({
					where: {
						delegationId_userId: {
							delegationId: delegation.id,
							userId: body.newHeadDelegateUserId
						}
					},
					data: {
						isHeadDelegate: true
					}
				});
			});
		},
		{
			body: t.Object({ newHeadDelegateUserId: t.String() }),
			params: t.Object({ id: t.String() })
		}
	)
	.delete('/delegation/:id/leave', async ({ permissions, params }) => {
		const user = permissions.mustBeLoggedIn();
		const delegation = await db.delegation.findUniqueOrThrow({
			where: {
				id: params.id,
				AND: [permissions.allowDatabaseAccessTo('delete').Delegation]
			}
		});

		await db.$transaction(async (tx) => {
			const userIsHeadDelegate = (
				await tx.delegationMember.findUniqueOrThrow({
					where: {
						delegationId_userId: {
							delegationId: delegation.id,
							userId: user.sub
						}
					},
					select: {
						isHeadDelegate: true
					}
				})
			).isHeadDelegate;

			await tx.delegationMember.delete({
				where: {
					delegationId_userId: {
						delegationId: delegation.id,
						userId: user.sub
					}
				}
			});

			if (userIsHeadDelegate) {
				const newHeadDelegate = await tx.delegationMember.findFirstOrThrow({
					where: {
						delegationId: delegation.id
					},
					select: {
						id: true
					}
				});

				console.log(newHeadDelegate);

				await tx.delegationMember.update({
					where: {
						id: newHeadDelegate.id
					},
					data: {
						isHeadDelegate: true
					}
				});
			}
		});

		return true;
	})
	.patch(
		'/delegation/:id/completeRegistration',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();

			removeTooSmallRoleApplications(params.id);

			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					id: params.id,
					AND: [permissions.allowDatabaseAccessTo('update').Delegation]
				},
				include: {
					members: true,
					appliedForRoles: true
				}
			});

			if (delegation.members.length < 2) {
				throw new Error('Not enough members');
			}

			if (delegation.appliedForRoles.length < 3) {
				throw new Error('Not enough role applications');
			}

			if (!delegation.school || !delegation.experience || !delegation.motivation) {
				throw new Error('Missing information');
			}

			await db.delegation.update({
				where: {
					id: params.id
				},
				data: {
					applied: true
				}
			});

			return true;
		},
		{
			params: t.Object({ id: t.String() })
		}
	);
