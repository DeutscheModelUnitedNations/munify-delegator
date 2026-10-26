import { db } from '#api/db/db.js';
import { enum_, object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	committeeAgendaItemPubsub,
	committeePubsub,
	conferenceRolePubsub,
	resolutionPubsub,
	roleApplicationPubsub
} from '#api/pubsub.js';
import {
	assertCanCreateCommittee,
	assertCanDeleteCommittee,
	assertCanPlanCommitteeSeats,
	assertCanUpdateCommittee,
	registerCommitteeAbilities
} from './committeePermissions';
import {
	createCommittee,
	deleteCommittee,
	setCommitteeNationSeat,
	setCommitteeRegionalBaseline,
	updateCommittee
} from './committeeService';

registerCommitteeAbilities();

export const CommitteeRef = object({ table: 'committee' });
query({ table: 'committee' });

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
			await assertCanCreateCommittee(ctx, args.conferenceId);
			const createdId = await createCommittee(args);

			committeePubsub.created();

			return db.query.committee
				.findFirst(
					query(
						(await ctx.abilities.committee.filter('read')).merge({ where: { id: createdId } }).query
							.single
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
			const before = await assertCanUpdateCommittee(ctx, args.id);
			const { applicationsTidied } = await updateCommittee(args.id, before, args);

			committeePubsub.updated(args.id);
			if (applicationsTidied) roleApplicationPubsub.removed();

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
			await assertCanDeleteCommittee(ctx, args.id);
			const { droppedRoleIds } = await deleteCommittee(args.id);

			committeePubsub.removed();
			if (droppedRoleIds.length > 0) conferenceRolePubsub.removed();
			// the agenda items go with it, its resolutions lose their committee
			committeeAgendaItemPubsub.removed();
			resolutionPubsub.updated();
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
			const committee = await assertCanPlanCommitteeSeats(ctx, args.committeeId);
			const { rolesChanged } = await setCommitteeNationSeat(
				{ id: args.committeeId, conferenceId: committee.conferenceId },
				args.nationAlpha3Code,
				args.enabled
			);
			if (!args.enabled) roleApplicationPubsub.removed();
			if (rolesChanged) {
				if (args.enabled) conferenceRolePubsub.created();
				else conferenceRolePubsub.removed();
			}

			committeePubsub.updated(args.committeeId);

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
			const committee = await assertCanPlanCommitteeSeats(ctx, args.committeeId);
			await setCommitteeRegionalBaseline(
				{ id: args.committeeId, regionalBaselineTargets: committee.regionalBaselineTargets },
				args.baseline,
				args.targets
			);

			committeePubsub.updated(args.committeeId);

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
