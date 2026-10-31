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
import { regionalBaselineArgsSchema } from './committeeRules';

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
			numOfSeatsPerDelegation: t.arg
				.int({ required: true, description: 'How many seats each nation has in it; at least one.' })
				.validate(seatCountSchema)
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
			'Changes the given fields of a committee; left out or `null` keeps a field, `null` clears the resolution headline. Seats per delegation below the members of one delegation assigned to it are refused with CONFLICT; lowering them drops the applications for its nations that no longer fit.',
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
			'Deletes a committee with its agenda items; its resolutions stay without it, and nations it seated alone stop being offered. Refused with CONFLICT while somebody is assigned to it or one of its agenda items has papers.',
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
			"Sets (rather than toggles) whether a nation holds a seat in a committee, so that concurrent clicks of several people converge on the same state. The first seat makes the nation one of the conference's roles, the last one ends that unless a delegation holds it. Taking a seat away is refused with CONFLICT while members of the delegation holding the nation sit in the committee; an unknown nation is NOT_FOUND.",
		type: CommitteeRef,
		args: {
			committeeId: t.arg.id({ required: true }),
			nationAlpha3Code: t.arg.string({ required: true, description: 'Any case.' }),
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
			targets: t.arg.intList({
				description:
					'One target per regional group; a manual baseline needs at least one above zero. Left out keeps the stored targets, which then have to suit the baseline.'
			})
		},
		validate: regionalBaselineArgsSchema,
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
