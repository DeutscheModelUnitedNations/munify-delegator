import { db, schema } from '$api/db/db';
import {
	abilityBuilder,
	enum_,
	object,
	pubsub as rumblePubsub,
	query,
	schemaBuilder
} from '$api/rumble';
import {
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import {
	assertCommitteeDeletable,
	assertRegionalBaselineTargets,
	assertSeatsPerDelegationAllowed,
	committeeUpdateData,
	seatRemovalBlockersWhere
} from '$api/services/seatPlanning';
import { tidyRoleApplicationsForRoles } from '$api/services/tidyRoleApplications';
import formatNames from '$lib/helpers/formatNames';
import { m } from '$lib/paraglide/messages';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';
import { assignmentVisible } from '$api/services/assignmentVisibility';

// Ported from abilities/entities/committee.ts
abilityBuilder.committee.allow('read');
abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

// Project management sets up its committees. Which nations sit in them is the seat planning's
// call, which the content lead shares (`setCommitteeNationSeat`, `setCommitteeRegionalBaseline`).
abilityBuilder.committee
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

export const CommitteeRef = object({
	table: 'committee',
	adjust: (t) => ({
		// Who sits in a committee is part of the assignment, which participants only see once it
		// is released.
		delegationMembers: t.relation('delegationMembers', {
			query: async (_args, ctx) =>
				(await ctx.abilities.delegationMember.filter('read')).merge({
					where: assignmentVisible(ctx)
				}).query.many
		})
	})
});
query({ table: 'committee' });
const pubsub = rumblePubsub({ table: 'committee' });
const agendaItemPubsub = rumblePubsub({ table: 'committeeAgendaItem' });
const roleApplicationPubsub = rumblePubsub({ table: 'roleApplication' });
const resolutionPubsub = rumblePubsub({ table: 'resolution' });

const regionalBaselineEnum = enum_({ tsName: 'regionalBaseline' });

schemaBuilder.mutationFields((t) => ({
	createCommittee: t.drizzleField({
		type: CommitteeRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			abbreviation: t.arg.string({ required: true }),
			numOfSeatsPerDelegation: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			// creating a committee changes the conference set-up, which is the management's call
			await assertTeamRole(ctx, args.conferenceId, PROJECT_MANAGEMENT_ROLES);
			assertSeatsPerDelegationAllowed(args.numOfSeatsPerDelegation, []);

			const created = await db
				.insert(schema.committee)
				.values({
					conferenceId: args.conferenceId,
					name: args.name,
					abbreviation: args.abbreviation,
					numOfSeatsPerDelegation: args.numOfSeatsPerDelegation
				})
				.returning({ id: schema.committee.id })
				.then(assertFirstEntryExists);

			pubsub.created();

			return db.query.committee
				.findFirst(
					query(
						(await ctx.abilities.committee.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateCommittee: t.drizzleField({
		type: CommitteeRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			abbreviation: t.arg.string(),
			resolutionHeadline: t.arg.string(),
			numOfSeatsPerDelegation: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			const updateFilter = (await ctx.abilities.committee.filter('update')).merge({
				where: { id: args.id }
			});
			const before = await db.query.committee
				.findFirst({
					where: updateFilter.query.single.where,
					columns: { conferenceId: true, numOfSeatsPerDelegation: true },
					with: {
						nations: { columns: { alpha3Code: true } },
						delegationMembers: { columns: { delegationId: true } }
					}
				})
				.then(assertFindFirstExists);

			assertSeatsPerDelegationAllowed(args.numOfSeatsPerDelegation, before.delegationMembers);

			await db
				.update(schema.committee)
				.set(committeeUpdateData(args))
				.where(updateFilter.sql.where);

			pubsub.updated(args.id);

			// fewer seats per delegation shrink every nation of the committee
			const seatsAfter = args.numOfSeatsPerDelegation ?? before.numOfSeatsPerDelegation;
			if (seatsAfter < before.numOfSeatsPerDelegation) {
				await tidyRoleApplicationsForRoles(before.conferenceId, {
					nationAlpha3Codes: before.nations.map((nation) => nation.alpha3Code)
				});
				roleApplicationPubsub.removed();
			}

			return db.query.committee
				.findFirst(
					query(
						(await ctx.abilities.committee.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * A committee can only go while nobody is assigned to it and none of its agenda items has
	 * papers; agenda items without papers are deleted with it.
	 */
	deleteCommittee: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleteFilter = (await ctx.abilities.committee.filter('delete')).merge({
				where: { id: args.id }
			});

			const { conferenceId, nationAlpha3Codes } = await db.transaction(async (tx) => {
				const existing = await tx.query.committee.findFirst({
					where: deleteFilter.query.single.where,
					columns: { id: true, conferenceId: true },
					with: {
						nations: { columns: { alpha3Code: true } },
						delegationMembers: { columns: { id: true } }
					}
				});
				if (!existing) {
					throw new GraphQLError('Committee not found, or not yours to delete');
				}
				const papers = await tx.query.paper.findMany({
					where: { agendaItem: { committeeId: existing.id } },
					columns: { id: true }
				});

				assertCommitteeDeletable(existing.delegationMembers.length, papers.length);

				await tx.delete(schema.committee).where(eq(schema.committee.id, existing.id));

				return {
					conferenceId: existing.conferenceId,
					nationAlpha3Codes: existing.nations.map((nation) => nation.alpha3Code)
				};
			});

			pubsub.removed();
			// the agenda items go with it, its resolutions lose their committee
			agendaItemPubsub.removed();
			resolutionPubsub.updated();

			await tidyRoleApplicationsForRoles(conferenceId, { nationAlpha3Codes });
			roleApplicationPubsub.removed();

			return true;
		}
	}),

	/**
	 * Sets (rather than toggles) whether a nation holds a seat in a committee, so that concurrent
	 * clicks of several people converge on the same state.
	 */
	setCommitteeNationSeat: t.drizzleField({
		type: CommitteeRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			nationAlpha3Code: t.arg.string({ required: true }),
			enabled: t.arg.boolean({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const committee = await db.query.committee
				.findFirst({ where: { id: args.committeeId }, columns: { conferenceId: true } })
				.then(assertFindFirstExists);
			await assertTeamRole(ctx, committee.conferenceId, SEAT_PLANNING_ROLES);

			const nation = await db.query.nation.findFirst({
				where: { alpha3Code: args.nationAlpha3Code.toLowerCase() },
				columns: { alpha3Code: true }
			});
			if (!nation) throw new GraphQLError('Nation not found');

			if (args.enabled) {
				await db
					.insert(schema.committeeToNation)
					.values({ a: args.committeeId, b: nation.alpha3Code })
					.onConflictDoNothing();
			} else {
				await db.transaction(async (tx) => {
					const blockers = await tx.query.delegationMember.findMany({
						where: seatRemovalBlockersWhere(args.committeeId, nation.alpha3Code),
						columns: { id: true },
						with: { user: { columns: { givenName: true, familyName: true } } }
					});

					if (blockers.length > 0) {
						throw new GraphQLError(
							m.seatRemovalBlocked({
								members: blockers
									.map(({ user }) => formatNames(user.givenName, user.familyName))
									.join(', ')
							})
						);
					}

					await tx
						.delete(schema.committeeToNation)
						.where(
							and(
								eq(schema.committeeToNation.a, args.committeeId),
								eq(schema.committeeToNation.b, nation.alpha3Code)
							)
						);
				});

				await tidyRoleApplicationsForRoles(committee.conferenceId, {
					nationAlpha3Codes: [nation.alpha3Code]
				});
				roleApplicationPubsub.removed();
			}

			pubsub.updated(args.committeeId);

			return db.query.committee
				.findFirst(
					query(
						(await ctx.abilities.committee.filter('read')).merge({
							where: { id: args.committeeId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Sets what the regional distribution of the committee is compared to in the seat planning.
	 * Manual targets are kept when switching to a template, so switching back restores them.
	 */
	setCommitteeRegionalBaseline: t.drizzleField({
		type: CommitteeRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			baseline: t.arg({ type: regionalBaselineEnum, required: true }),
			targets: t.arg.intList()
		},
		resolve: async (query, _root, args, ctx) => {
			const committee = await db.query.committee
				.findFirst({
					where: { id: args.committeeId },
					columns: { conferenceId: true, regionalBaselineTargets: true }
				})
				.then(assertFindFirstExists);
			await assertTeamRole(ctx, committee.conferenceId, SEAT_PLANNING_ROLES);

			const targets = args.targets ?? committee.regionalBaselineTargets;
			assertRegionalBaselineTargets(args.baseline, targets);

			await db
				.update(schema.committee)
				.set({ regionalBaseline: args.baseline, regionalBaselineTargets: targets })
				.where(eq(schema.committee.id, args.committeeId));

			pubsub.updated(args.committeeId);

			return db.query.committee
				.findFirst(
					query(
						(await ctx.abilities.committee.filter('read')).merge({
							where: { id: args.committeeId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
