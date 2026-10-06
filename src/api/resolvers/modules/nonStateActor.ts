import { builder } from '../builder';
import {
	deleteOneNonStateActorMutationObject,
	findManyNonStateActorQueryObject,
	findUniqueNonStateActorQueryObject,
	NonStateActorAbbreviationFieldObject,
	NonStateActorConferenceFieldObject,
	NonStateActorDescriptionFieldObject,
	NonStateActorFontAwesomeIconFieldObject,
	NonStateActorIdFieldObject,
	NonStateActorNameFieldObject,
	NonStateActorSeatAmountFieldObject,
	updateOneNonStateActorMutationObject
} from '$db/generated/graphql/NonStateActor';
import { db } from '$db/db';
import { Prisma } from '@prisma/client';
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';
import { tidyRoleApplicationsForRoles } from '$api/services/removeTooSmallRoleApplications';
import { normalizeRoleApplicationRanks } from '$api/services/normalizeRoleApplicationRanks';
import {
	assertNonStateActorDeletable,
	assertSeatsPerDelegationAllowed,
	nonStateActorUpdateData
} from '$api/services/seatPlanning';

builder.prismaObject('NonStateActor', {
	fields: (t) => ({
		id: t.field(NonStateActorIdFieldObject),
		name: t.field(NonStateActorNameFieldObject),
		description: t.field(NonStateActorDescriptionFieldObject),
		fontAwesomeIcon: t.field(NonStateActorFontAwesomeIconFieldObject),
		abbreviation: t.field(NonStateActorAbbreviationFieldObject),
		seatAmount: t.field(NonStateActorSeatAmountFieldObject),
		conference: t.relation('conference', NonStateActorConferenceFieldObject),
		roleApplications: t.relation('roleApplications', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').RoleApplication
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyNonStateActorQueryObject(t);
	return {
		findManyNonStateActors: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').NonStateActor]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueNonStateActorQueryObject(t);
	return {
		findUniqueNonStateActor: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').NonStateActor]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

/** Prisma reports duplicate names/abbreviations of a conference as a unique constraint violation */
async function withUniqueNameCheck<T>(operation: Promise<T>) {
	try {
		return await operation;
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
			throw new GraphQLError(m.nonStateActorNotUnique());
		}
		throw error;
	}
}

builder.mutationFields((t) => ({
	createOneNonStateActor: t.prismaField({
		type: 'NonStateActor',
		args: {
			conferenceId: t.arg.id({ required: true }),
			data: t.arg({
				required: true,
				type: t.builder.inputType('NonStateActorCreateDataInput', {
					fields: (t) => ({
						name: t.string({ required: true }),
						abbreviation: t.string({ required: true }),
						description: t.string({ required: true }),
						fontAwesomeIcon: t.string({ required: false }),
						seatAmount: t.int({ required: true })
					})
				})
			})
		},
		resolve: async (query, root, args, ctx) => {
			await db.conference.findUniqueOrThrow({
				where: {
					id: args.conferenceId,
					AND: [ctx.permissions.allowDatabaseAccessTo('planSeats').Conference]
				}
			});
			assertSeatsPerDelegationAllowed(args.data.seatAmount, []);

			return await withUniqueNameCheck(
				db.nonStateActor.create({
					...query,
					data: {
						...args.data,
						fontAwesomeIcon: args.data.fontAwesomeIcon ?? null,
						conferenceId: args.conferenceId
					}
				})
			);
		}
	})
}));

builder.mutationFields((t) => {
	const field = updateOneNonStateActorMutationObject(t);
	return {
		updateOneNonStateActor: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					required: true,
					type: t.builder.inputType('NonStateActorUpdateDataInput', {
						fields: (t) => ({
							name: t.string({ required: false }),
							abbreviation: t.string({ required: false }),
							description: t.string({ required: false }),
							fontAwesomeIcon: t.string({ required: false }),
							seatAmount: t.int({ required: false })
						})
					})
				})
			},
			resolve: async (query, root, args, ctx) => {
				const where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').NonStateActor]
				};
				const data = nonStateActorUpdateData(args.data);

				const before = await db.nonStateActor.findUniqueOrThrow({
					where,
					select: { id: true, conferenceId: true, seatAmount: true }
				});

				const nonStateActor = await withUniqueNameCheck(
					db.nonStateActor.update({ ...query, where, data })
				);

				// lowering the seats is allowed, but applications that no longer fit are dropped
				if ((args.data.seatAmount ?? before.seatAmount) < before.seatAmount) {
					await tidyRoleApplicationsForRoles(before.conferenceId, {
						nonStateActorIds: [before.id]
					});
				}

				return nonStateActor;
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneNonStateActorMutationObject(t);
	return {
		deleteOneNonStateActor: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx) => {
				const where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').NonStateActor]
				};

				return await db.$transaction(async (tx) => {
					const existing = await tx.nonStateActor.findUniqueOrThrow({
						where,
						select: { _count: { select: { assignedDelegations: true } } }
					});

					assertNonStateActorDeletable(existing._count.assignedDelegations);

					// applications for this NSA are removed with it, closing the gaps in the rankings
					const applications = await tx.roleApplication.findMany({
						where: { nonStateActor: where },
						select: { delegationId: true }
					});
					await tx.roleApplication.deleteMany({ where: { nonStateActor: where } });
					for (const delegationId of new Set(applications.map((a) => a.delegationId))) {
						await normalizeRoleApplicationRanks(tx, delegationId);
					}

					return await tx.nonStateActor.delete({ ...query, where });
				});
			}
		})
	};
});
