import { builder } from '../builder';
import {
	CommitteeAbbreviationFieldObject,
	CommitteeConferenceFieldObject,
	CommitteeIdFieldObject,
	CommitteeNameFieldObject,
	CommitteeNumOfSeatsPerDelegationFieldObject,
	CommitteeResolutionHeadlineFieldObject,
	deleteOneCommitteeMutationObject,
	findManyCommitteeQueryObject,
	findUniqueCommitteeQueryObject,
	updateOneCommitteeMutationObject
} from '$db/generated/graphql/Committee';
import { db } from '$db/db';
import { GraphQLError } from 'graphql';
import { m } from '$lib/paraglide/messages';
import formatNames from '$lib/services/formatNames';
import {
	assertCommitteeDeletable,
	assertSeatsPerDelegationAllowed,
	committeeUpdateData,
	seatRemovalBlockersWhere
} from '$api/services/seatPlanning';
import { tidyRoleApplicationsForRoles } from '$api/services/removeTooSmallRoleApplications';

export const GQLCommittee = builder.prismaObject('Committee', {
	fields: (t) => ({
		id: t.field(CommitteeIdFieldObject),
		name: t.field(CommitteeNameFieldObject),
		abbreviation: t.field(CommitteeAbbreviationFieldObject),
		numOfSeatsPerDelegation: t.field(CommitteeNumOfSeatsPerDelegationFieldObject),
		resolutionHeadline: t.field(CommitteeResolutionHeadlineFieldObject),
		conference: t.relation('conference', CommitteeConferenceFieldObject),
		nations: t.relation('nations', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').Nation
			})
		}),
		delegationMembers: t.relation('delegationMembers', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').DelegationMember
			})
		}),
		agendaItems: t.relation('CommitteeAgendaItem', {
			query: (_args, ctx) => ({
				where: ctx.permissions.allowDatabaseAccessTo('list').CommitteeAgendaItem
			})
		})
	})
});

builder.queryFields((t) => {
	const field = findManyCommitteeQueryObject(t);
	return {
		findManyCommittees: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('list').Committee]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.queryFields((t) => {
	const field = findUniqueCommitteeQueryObject(t);
	return {
		findUniqueCommittee: t.prismaField({
			...field,
			resolve: (query, root, args, ctx, info) => {
				args.where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('read').Committee]
				};

				return field.resolve(query, root, args, ctx, info);
			}
		})
	};
});

builder.mutationFields((t) => ({
	createOneCommittee: t.prismaField({
		type: 'Committee',
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			abbreviation: t.arg.string({ required: true }),
			numOfSeatsPerDelegation: t.arg.int({ required: true })
		},
		resolve: async (query, root, args, ctx) => {
			// creating a committee changes the conference set-up, which is the management's call
			await db.conference.findUniqueOrThrow({
				where: {
					id: args.conferenceId,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Conference]
				}
			});

			assertSeatsPerDelegationAllowed(args.numOfSeatsPerDelegation, []);

			return await db.committee.create({
				...query,
				data: {
					conferenceId: args.conferenceId,
					name: args.name,
					abbreviation: args.abbreviation,
					numOfSeatsPerDelegation: args.numOfSeatsPerDelegation
				}
			});
		}
	})
}));

builder.mutationFields((t) => {
	const field = updateOneCommitteeMutationObject(t);
	return {
		updateOneCommittee: t.prismaField({
			...field,
			args: {
				where: field.args.where,
				data: t.arg({
					type: t.builder.inputType('CommitteeUpdateDataInput', {
						fields: (t) => ({
							name: t.string({ required: false }),
							abbreviation: t.string({ required: false }),
							resolutionHeadline: t.string({ required: false }),
							numOfSeatsPerDelegation: t.int({ required: false })
						})
					})
				})
			},
			resolve: async (query, root, args, ctx) => {
				const where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('update').Committee]
				};
				const data = committeeUpdateData(args.data);

				const before = await db.committee.findUniqueOrThrow({
					where,
					select: {
						conferenceId: true,
						numOfSeatsPerDelegation: true,
						nations: { select: { alpha3Code: true } },
						delegationMembers: { select: { delegationId: true } }
					}
				});

				assertSeatsPerDelegationAllowed(
					args.data.numOfSeatsPerDelegation,
					before.delegationMembers
				);

				const committee = await db.committee.update({
					where,
					data,
					...query
				});

				// fewer seats per delegation shrink every nation of the committee
				const seatsAfter = args.data.numOfSeatsPerDelegation ?? before.numOfSeatsPerDelegation;
				if (seatsAfter < before.numOfSeatsPerDelegation) {
					await tidyRoleApplicationsForRoles(before.conferenceId, {
						nationAlpha3Codes: before.nations.map((n) => n.alpha3Code)
					});
				}

				return committee;
			}
		})
	};
});

builder.mutationFields((t) => {
	const field = deleteOneCommitteeMutationObject(t);
	return {
		deleteOneCommittee: t.prismaField({
			...field,
			resolve: async (query, root, args, ctx) => {
				const where = {
					...args.where,
					AND: [ctx.permissions.allowDatabaseAccessTo('delete').Committee]
				};

				const { committee, conferenceId, nationAlpha3Codes } = await db.$transaction(async (tx) => {
					const existing = await tx.committee.findUniqueOrThrow({
						where,
						select: {
							id: true,
							conferenceId: true,
							nations: { select: { alpha3Code: true } },
							_count: { select: { delegationMembers: true } }
						}
					});
					const papers = await tx.paper.count({
						where: { agendaItem: { committeeId: existing.id } }
					});

					assertCommitteeDeletable(existing._count.delegationMembers, papers);

					return {
						committee: await tx.committee.delete({ ...query, where }),
						conferenceId: existing.conferenceId,
						nationAlpha3Codes: existing.nations.map((n) => n.alpha3Code)
					};
				});

				await tidyRoleApplicationsForRoles(conferenceId, { nationAlpha3Codes });

				return committee;
			}
		})
	};
});

builder.mutationFields((t) => ({
	/**
	 * Sets (rather than toggles) whether a nation holds a seat in a committee, so that concurrent
	 * clicks of several people converge on the same state.
	 */
	setCommitteeNationSeat: t.prismaField({
		type: 'Committee',
		args: {
			committeeId: t.arg.id({ required: true }),
			nationAlpha3Code: t.arg.string({ required: true }),
			enabled: t.arg.boolean({ required: true })
		},
		resolve: async (query, root, args, ctx) => {
			const where = {
				id: args.committeeId,
				AND: [ctx.permissions.allowDatabaseAccessTo('planSeats').Committee]
			};
			const nation = await db.nation.findUniqueOrThrow({
				where: { alpha3Code: args.nationAlpha3Code.toLowerCase() }
			});

			if (args.enabled) {
				return await db.committee.update({
					...query,
					where,
					data: { nations: { connect: { alpha3Code: nation.alpha3Code } } }
				});
			}

			const { conferenceId } = await db.committee.findUniqueOrThrow({
				where,
				select: { conferenceId: true }
			});

			const committee = await db.$transaction(async (tx) => {
				const blockers = await tx.delegationMember.findMany({
					where: seatRemovalBlockersWhere(args.committeeId, nation.alpha3Code),
					select: { user: { select: { given_name: true, family_name: true } } }
				});

				if (blockers.length > 0) {
					throw new GraphQLError(
						m.seatRemovalBlocked({
							members: blockers
								.map(({ user }) => formatNames(user.given_name, user.family_name))
								.join(', ')
						})
					);
				}

				return await tx.committee.update({
					...query,
					where,
					data: { nations: { disconnect: { alpha3Code: nation.alpha3Code } } }
				});
			});

			await tidyRoleApplicationsForRoles(conferenceId, {
				nationAlpha3Codes: [nation.alpha3Code]
			});

			return committee;
		}
	})
}));
