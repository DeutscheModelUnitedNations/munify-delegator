import { permissionsPlugin } from '$api/auth/permissionsPlugin';
import { CRUDMaker } from '$api/util/crudmaker';
import { fetchUserParticipations } from '$api/auth/helper/fetchUserParticipations';
import { languageExtractor } from '$api/util/languageExtractor';
import { PermissionCheckError, UserFacingError } from '$api/util/logger';
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
import * as m from '$lib/paraglide/messages';
import { requireToBeConferenceAdmin } from '$api/auth/helper/requireUserToBeConferenceAdmin';

// https://github.com/CyberAP/nanoid-dictionary
const makeEntryCode = customAlphabet('6789BCDFGHJKLMNPQRTW', 6);

export const delegation = new Elysia()
	.use(CRUDMaker.updateOne('delegation'))
	.use(CRUDMaker.deleteOne('delegation'))
	.use(permissionsPlugin)
	.use(languageExtractor)
	.get(
		'delegation',
		async ({ permissions, query }) => {
			permissions.mustBeLoggedIn();
			return await db.delegation.findMany({
				where: {
					conferenceId: query.conferenceId,
					supervisors: {
						some: { id: query.supervisorId }
					},
					AND: [permissions.allowDatabaseAccessTo('list').Delegation]
				},
				include: {
					_count: {
						select: {
							members: true,
							supervisors: true,
							appliedForRoles: true
						}
					}
				},
				orderBy: {
					entryCode: 'asc'
				}
			});
		},
		{
			query: t.Object({
				conferenceId: t.Optional(t.String()),
				supervisorId: t.Optional(t.String())
			}),
			response: t.Array(
				t.Composite([
					DelegationPlain,
					t.Object({
						_count: t.Object({
							members: t.Number(),
							supervisors: t.Number(),
							appliedForRoles: t.Number()
						})
					})
				])
			)
		}
	)
	.get(
		'delegation/:id',
		async ({ permissions, params }) => {
			//TODO when we want to continue to use such nested objects we should probably switch to GQL
			const delegation = await db.delegation.findUniqueOrThrow({
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
		async ({ permissions, body, languageTag }) => {
			const user = permissions.mustBeLoggedIn();

			// if the user somehow is already participating in the conference, throw an error
			await fetchUserParticipations({
				conferenceId: body.conference.connect.id,
				userId: user.sub!,
				throwIfAnyIsFound: { languageTag }
			});

			return db.$transaction(async (tx) => {
				const delegation = await tx.delegation.create({
					data: {
						conference: body.conference,
						motivation: body.motivation ?? '',
						school: body.school ?? '',
						experience: body.experience ?? '',
						entryCode: makeEntryCode()
					}
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
			body: t.Object({
				conference: t.Object({ connect: t.Object({ id: t.String() }) }),
				motivation: t.Optional(t.String()),
				school: t.Optional(t.String()),
				experience: t.Optional(t.String())
			}),
			response: DelegationPlain
		}
	)
	.post(
		`/delegation/join`,
		async ({ permissions, body, languageTag }) => {
			const user = permissions.mustBeLoggedIn();
			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					entryCode: body.entryCode
				}
			});

			if (delegation.applied) {
				throw new PermissionCheckError(m.delegationHasAlreadyApplied({}, { languageTag }));
			}

			// if the user somehow is already participating in the conference, throw an error
			await fetchUserParticipations({
				conferenceId: delegation.conferenceId,
				userId: user.sub,
				throwIfAnyIsFound: { languageTag }
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
		async ({ permissions, body, languageTag }) => {
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
			if (participations.foundDelegationMember) {
				throw new PermissionCheckError(m.youAreAlreadyDelegationMember({}, { languageTag }));
			}
			if (participations.foundSingleParticipant) {
				throw new PermissionCheckError(m.youAreAlreadySingleParticipant({}, { languageTag }));
			}
			if (participations.foundTeamMember) {
				throw new PermissionCheckError(m.youAreAlreadyTeamMember({}, { languageTag }));
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
		async ({ query, permissions }) => {
			permissions.mustBeLoggedIn();
			const delegation = await db.delegation.findUniqueOrThrow({
				where: {
					conferenceId: query.conferenceId,
					entryCode: query.entryCode
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
			body: t.Unknown(),
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
	})
	.patch(
		'/delegation/:id/revokeApplication',
		async ({ permissions, params }) => {
			const user = permissions.mustBeLoggedIn();

			await requireToBeConferenceAdmin({ conferenceId: params.id, user });

			await db.delegation.update({
				where: {
					id: params.id
				},
				data: {
					applied: false
				}
			});
		},
		{
			params: t.Object({ id: t.String() }),
			body: t.Unknown()
		}
	);
