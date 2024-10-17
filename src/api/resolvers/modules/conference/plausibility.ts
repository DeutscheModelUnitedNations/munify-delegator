import { db } from '$db/db';
import { builder } from '../../builder';
import type { User } from '@prisma/client';
import { GQLUser } from '../user';
import { userDataCompleteCheck } from '$api/services/userDataComplete';

const PlausibilityResult = builder
	.objectRef<{
		tooYoungUsers: User[];
		tooOldUsers: User[];
		shouldBeSupervisor: User[];
		shouldNotBeSupervisor: User[];
		dataMissing: User[];
	}>('PlausibilityResult')
	.implement({
		fields: (t) => ({
			tooYoungUsers: t.expose('tooYoungUsers', {
				type: [GQLUser]
			}),
			tooOldUsers: t.expose('tooOldUsers', {
				type: [GQLUser]
			}),
			shouldBeSupervisor: t.expose('shouldBeSupervisor', {
				type: [GQLUser]
			}),
			shouldNotBeSupervisor: t.expose('shouldNotBeSupervisor', {
				type: [GQLUser]
			}),
			dataMissing: t.expose('dataMissing', {
				type: [GQLUser]
			})
		})
	});

builder.queryFields((t) => {
	return {
		conferencePlausibility: t.field({
			type: PlausibilityResult,
			args: {
				conferenceId: t.arg.id({ required: true })
			},
			resolve: async (root, args, ctx) => {
				const tooYoungUsers = await db.user.findMany({
					where: {
						AND: [
							{
								OR: [
									{ singleParticipant: { some: { conferenceId: args.conferenceId } } },
									{ delegationMemberships: { some: { conferenceId: args.conferenceId } } }
								]
							},
							{
								birthday: {
									gt: new Date(new Date().getFullYear() - 13, 0, 1)
								}
							},
							ctx.permissions.allowDatabaseAccessTo('list').User
						]
					}
				});

				const tooOldUsers = await db.user.findMany({
					where: {
						AND: [
							{
								OR: [
									{ singleParticipant: { some: { conferenceId: args.conferenceId } } },
									{ delegationMemberships: { some: { conferenceId: args.conferenceId } } }
								]
							},
							{
								birthday: {
									lt: new Date(new Date().getFullYear() - 21, 0, 1),
									gt: new Date(new Date().getFullYear() - 26, 0, 1)
								}
							},
							ctx.permissions.allowDatabaseAccessTo('list').User
						]
					}
				});

				const shouldBeSupervisor = await db.user.findMany({
					where: {
						AND: [
							{
								OR: [
									{ singleParticipant: { some: { conferenceId: args.conferenceId } } },
									{ delegationMemberships: { some: { conferenceId: args.conferenceId } } }
								]
							},
							{
								birthday: { lt: new Date(new Date().getFullYear() - 26, 0, 1) }
							},
							ctx.permissions.allowDatabaseAccessTo('list').User
						]
					}
				});

				const shouldNotBeSupervisor = await db.user.findMany({
					where: {
						AND: [
							{
								OR: [
									{ singleParticipant: { some: { conferenceId: args.conferenceId } } },
									{ delegationMemberships: { some: { conferenceId: args.conferenceId } } }
								]
							},
							{
								birthday: { gt: new Date(new Date().getFullYear() - 21, 0, 1) }
							},
							ctx.permissions.allowDatabaseAccessTo('list').User
						]
					}
				});

				const dataMissing = (
					await db.user.findMany({
						where: {
							OR: [
								{ singleParticipant: { some: { conferenceId: args.conferenceId } } },
								{ delegationMemberships: { some: { conferenceId: args.conferenceId } } },
								{ conferenceSupervisor: { some: { conferenceId: args.conferenceId } } }
							],

							AND: [ctx.permissions.allowDatabaseAccessTo('list').User]
						}
					})
				).filter((u) => userDataCompleteCheck(u, 'de').length === 0);

				return {
					tooYoungUsers,
					tooOldUsers,
					shouldBeSupervisor,
					shouldNotBeSupervisor,
					dataMissing
				};
			}
		})
	};
});
