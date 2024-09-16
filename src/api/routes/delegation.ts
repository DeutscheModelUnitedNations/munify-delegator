import { PermissionCheckError, permissionsPlugin } from '$api/auth/permissions';
import { CRUDMaker } from '$api/util/crudmaker';
import { fetchUserParticipations } from '$api/util/fetchUserParticipations';
import { UserFacingError } from '$api/util/logger';
import { tidyRoleApplications } from '$api/util/removeTooSmallRoleApplications';
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

// https://github.com/CyberAP/nanoid-dictionary
const makeEntryCode = customAlphabet('6789BCDFGHJKLMNPQRTW', 6);

export const delegation = new Elysia()
	.use(CRUDMaker.getAll('delegation'))
	.use(CRUDMaker.updateOne('delegation'))
	.use(CRUDMaker.deleteOne('delegation'))
	.use(permissionsPlugin)
	.get(
		'delegation/:id',
		async ({ permissions, params }) => {
			//TODO when we want to continue to use such nested objects we should probably switch to GQL
			return await db.delegation.findUniqueOrThrow({
				where: {
					id: params.id,
					AND: [permissions.allowDatabaseAccessTo('read').Delegation]
				},
				include: {
					members: {
						where: {
							AND: [permissions.allowDatabaseAccessTo('read').DelegationMember]
						},
						include: {
							user: {
								//TODO this does not perform an actual permission check on the user entity
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
						where: {
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
							}
						}
					},
					supervisors: {
						where: {
							AND: [permissions.allowDatabaseAccessTo('read').ConferenceSupervisor]
						},
						include: {
							user: {
								//TODO this does not perform an actual permission check on the user entity
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

			// if the user somehow is already participating in the conference, throw an error
			await fetchUserParticipations({
				conferenceId: body.conference.connect.id,
				userId: user.sub!,
				throwIfAnyIsFound: true
			});

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
					entryCode: body.entryCode
				}
			});

			if (delegation.applied) {
				throw new PermissionCheckError(
					'Delegation has already applied, joins are not possible anymore'
				);
			}

			// if the user somehow is already participating in the conference, throw an error
			await fetchUserParticipations({
				conferenceId: delegation.conferenceId,
				userId: user.sub,
				throwIfAnyIsFound: true
			});

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

			await tidyRoleApplications(delegation.id);
		},
		{
			body: t.Composite([t.Required(t.Pick(DelegationWhereUnique, ['entryCode']))])
		}
	)
	.post(
		`/delegation/supervise`,
		async ({ permissions, body }) => {
			const user = permissions.mustBeLoggedIn();
			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					entryCode: body.entryCode
				}
			});

			const participations = await fetchUserParticipations({
				conferenceId: delegation.conferenceId,
				userId: user.sub!
			});

			// if the user somehow is already participating in the conference as something else than a supervisor, throw
			if (
				participations.foundDelegationMember ||
				participations.foundSingleParticipant ||
				participations.foundTeamMember
			) {
				throw new PermissionCheckError(
					'You are already a participant in this conference, you cannot supervise simultaneously'
				);
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
		},
		{
			body: t.Composite([t.Required(t.Pick(DelegationWhereUnique, ['entryCode']))])
		}
	)
	.get(
		`/delegation/preview`,
		async ({  query }) => {
			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					conferenceId: query.conferenceId,
					entryCode: query.entryCode,
					// we dont want permission checks here. We carefully choose what to send, see the select statements below
					// AND: [permissions.allowDatabaseAccessTo('read').Delegation]
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
									//TODO check if this is ok with our privacy policy
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

			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					id: params.id,
					AND: [permissions.allowDatabaseAccessTo('update').Delegation]
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
							userId: user.sub!
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
	//TODO move this to the delegation member routes?
	.delete('/delegation/:id/leave', async ({ permissions, params }) => {
		const user = permissions.mustBeLoggedIn();

		await db.$transaction(async (tx) => {
			const deletedMember = await tx.delegationMember.delete({
				where: {
					delegationId_userId: {
						delegationId: params.id,
						userId: user.sub
					},
					AND: [permissions.allowDatabaseAccessTo('delete').DelegationMember]
				}
			});

			if (deletedMember.isHeadDelegate) {
				const newHeadDelegate = await tx.delegationMember.findFirst({
					where: {
						delegationId: params.id
					}
				});

				if (!newHeadDelegate) {
					// if there is no one left in the delegation, close it
					await tx.delegation.delete({
						where: {
							id: params.id
						}
					});
					return;
				}

				// if there is a new head delegate, congratulations to your promotion!
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

		await tidyRoleApplications(params.id);
	})
	.patch('/delegation/:id/completeRegistration', async ({ permissions, params }) => {
		const delegation = await db.delegation.findUniqueOrThrow({
			where: {
				id: params.id,
				AND: [permissions.allowDatabaseAccessTo('update').Delegation]
			},
			include: {
				members: {
					where: {
						AND: [permissions.allowDatabaseAccessTo('read').DelegationMember]
					}
				},
				appliedForRoles: {
					where: {
						AND: [permissions.allowDatabaseAccessTo('read').RoleApplication]
					}
				}
			}
		});

		await tidyRoleApplications(params.id);

		if (delegation.members.length < 2) {
			throw new UserFacingError('Not enough members');
		}

		if (delegation.appliedForRoles.length < 3) {
			throw new UserFacingError('Not enough role applications');
		}

		if (!delegation.school || !delegation.experience || !delegation.motivation) {
			throw new UserFacingError('Missing information');
		}

		await db.delegation.update({
			where: {
				id: params.id
			},
			data: {
				applied: true
			}
		});
	});
