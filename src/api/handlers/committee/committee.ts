import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
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
import { seatCountSchema } from '#api/handlers/seatPlanning/seatPlanningService';

registerCommitteeAbilities();

export const CommitteeRef = object({ table: 'committee' });
query({ table: 'committee' });

const regionalBaselineEnum = enum_({ tsName: 'regionalBaseline' });

/** The committee as the caller may read it, for re-reading the row a mutation wrote. */
async function allowedCommittee({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.committee.filter('read')).merge({ where: { id } }).query.single;
}

schemaBuilder.mutationFields((t) => ({
	createCommittee: t.drizzleField({
		description: 'Adds a committee to the conference.',
		type: CommitteeRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			abbreviation: t.arg.string({ required: true }),
			numOfSeatsPerDelegation: t.arg.int({ required: true }).validate(seatCountSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCommittee({ ctx, conferenceId: args.conferenceId });
			const createdId = await createCommittee(args);

			return db.query.committee
				.findFirst(query(await allowedCommittee({ ctx, id: createdId })))
				.then(assertFindFirstExists);
		}
	}),

	updateCommittee: t.drizzleField({
		description:
			'Changes the given fields of a committee. Seats per delegation cannot drop below the members assigned to it; lowering them drops the applications for its nations that no longer fit.',
		type: CommitteeRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			abbreviation: t.arg.string(),
			resolutionHeadline: t.arg.string(),
			numOfSeatsPerDelegation: t.arg.int().validate(seatCountSchema.nullish())
		},
		resolve: async (query, _root, args, ctx) => {
			const before = await assertCanUpdateCommittee({ ctx, id: args.id });
			await updateCommittee({ id: args.id, before, data: args });

			return db.query.committee
				.findFirst(query(await allowedCommittee({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteCommittee: t.field({
		description:
			'A committee can only go while nobody is assigned to it and none of its agenda items has papers; agenda items without papers are deleted with it.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteCommittee({ ctx, id: args.id });
			await deleteCommittee(args.id);

			return true;
		}
	}),

	setCommitteeNationSeat: t.drizzleField({
		description:
			'Sets (rather than toggles) whether a nation holds a seat in a committee, so that concurrent clicks of several people converge on the same state.',
		type: CommitteeRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			nationAlpha3Code: t.arg.string({ required: true }),
			enabled: t.arg.boolean({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const committee = await assertCanPlanCommitteeSeats({ ctx, committeeId: args.committeeId });
			await setCommitteeNationSeat({
				committee: { id: args.committeeId, conferenceId: committee.conferenceId },
				nationAlpha3Code: args.nationAlpha3Code,
				enabled: args.enabled
			});

			return db.query.committee
				.findFirst(query(await allowedCommittee({ ctx, id: args.committeeId })))
				.then(assertFindFirstExists);
		}
	}),

	setCommitteeRegionalBaseline: t.drizzleField({
		description:
			'Sets what the regional distribution of the committee is compared to in the seat planning. Manual targets are kept when switching to a template, so switching back restores them.',
		type: CommitteeRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			baseline: t.arg({ type: regionalBaselineEnum, required: true }),
			targets: t.arg.intList()
		},
		resolve: async (query, _root, args, ctx) => {
			const committee = await assertCanPlanCommitteeSeats({ ctx, committeeId: args.committeeId });
			await setCommitteeRegionalBaseline({
				committee: {
					id: args.committeeId,
					regionalBaselineTargets: committee.regionalBaselineTargets
				},
				baseline: args.baseline,
				newTargets: args.targets
			});

			return db.query.committee
				.findFirst(query(await allowedCommittee({ ctx, id: args.committeeId })))
				.then(assertFindFirstExists);
		}
	})
}));
