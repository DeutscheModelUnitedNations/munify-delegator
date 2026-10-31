import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	nonStateActorUpdateData,
	seatCountSchema
} from '#api/handlers/seatPlanning/seatPlanningService';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanCreateConferenceRole,
	assertCanDeleteConferenceRole,
	assertCanUpdateConferenceRole,
	registerConferenceRoleAbilities
} from './conferenceRolePermissions';
import {
	createCustomRole,
	createNonStateActor,
	customRoleSeatsSchema,
	deleteCustomRole,
	deleteNonStateActor,
	updateCustomRole,
	updateNonStateActor
} from './conferenceRoleService';

registerConferenceRoleAbilities();

const ConferenceRoleRef = object({ table: 'conferenceRole' });
query({ table: 'conferenceRole' });

/**
 * Creates a role of the seat planning (a non-state actor, a custom role) and answers how to read
 * it back.
 */
async function createRole<A extends { conferenceId: string }>({
	ctx,
	args,
	create
}: {
	ctx: ApiContext;
	args: A;
	create: (args: A) => Promise<string>;
}) {
	await assertCanCreateConferenceRole({ ctx, conferenceId: args.conferenceId });
	const createdId = await create(args);
	return (await ctx.abilities.conferenceRole.filter('read')).merge({ where: { id: createdId } })
		.query.single;
}

schemaBuilder.mutationFields((t) => {
	/** What every role the seat planning creates names: its conference, name, icon and seats. */
	const plannedRoleArgs = (seats: typeof seatCountSchema) => ({
		conferenceId: t.arg.id({ required: true }),
		name: t.arg.string({ required: true }),
		fontAwesomeIcon: t.arg.string(),
		seatAmount: t.arg.int({ required: true }).validate(seats)
	});

	return {
		createNonStateActor: t.drizzleField({
			type: ConferenceRoleRef,
			args: {
				...plannedRoleArgs(seatCountSchema),
				abbreviation: t.arg.string({ required: true }),
				description: t.arg.string({ required: true })
			},
			resolve: async (query, _root, args, ctx) =>
				db.query.conferenceRole
					.findFirst(query(await createRole({ ctx, args, create: createNonStateActor })))
					.then(assertFindFirstExists)
		}),

		updateNonStateActor: t.drizzleField({
			type: ConferenceRoleRef,
			args: {
				id: t.arg.id({ required: true }),
				name: t.arg.string(),
				abbreviation: t.arg.string(),
				description: t.arg.string(),
				fontAwesomeIcon: t.arg.string(),
				seatAmount: t.arg.int().validate(seatCountSchema.nullish())
			},
			resolve: async (query, _root, args, ctx) => {
				const data = nonStateActorUpdateData(args);
				const before = await assertCanUpdateConferenceRole({
					ctx,
					id: args.id,
					kind: 'NON_STATE_ACTOR'
				});
				await updateNonStateActor({ before, data });

				return db.query.conferenceRole
					.findFirst(
						query(
							(await ctx.abilities.conferenceRole.filter('read')).merge({ where: { id: args.id } })
								.query.single
						)
					)
					.then(assertFindFirstExists);
			}
		}),

		deleteNonStateActor: t.field({
			type: 'Boolean',
			args: { id: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				await assertCanDeleteConferenceRole({ ctx, id: args.id, kind: 'NON_STATE_ACTOR' });
				await deleteNonStateActor(args.id);

				return true;
			}
		}),

		createCustomRole: t.drizzleField({
			description:
				'A custom role for single participants, such as the press, with how many it seats.',
			type: ConferenceRoleRef,
			args: { ...plannedRoleArgs(customRoleSeatsSchema), description: t.arg.string() },
			resolve: async (query, _root, args, ctx) =>
				db.query.conferenceRole
					.findFirst(query(await createRole({ ctx, args, create: createCustomRole })))
					.then(assertFindFirstExists)
		}),

		updateCustomRole: t.drizzleField({
			type: ConferenceRoleRef,
			args: {
				id: t.arg.id({ required: true }),
				name: t.arg.string(),
				description: t.arg.string(),
				fontAwesomeIcon: t.arg.string(),
				seatAmount: t.arg.int().validate(customRoleSeatsSchema.nullish())
			},
			resolve: async (query, _root, { id, ...data }, ctx) => {
				await assertCanUpdateConferenceRole({ ctx, id, kind: 'CUSTOM' });
				await updateCustomRole({ id, data });

				return db.query.conferenceRole
					.findFirst(
						query(
							(await ctx.abilities.conferenceRole.filter('read')).merge({ where: { id } }).query
								.single
						)
					)
					.then(assertFindFirstExists);
			}
		}),

		deleteCustomRole: t.field({
			type: 'Boolean',
			args: { id: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				await assertCanDeleteConferenceRole({ ctx, id: args.id, kind: 'CUSTOM' });
				await deleteCustomRole(args.id);

				return true;
			}
		})
	};
});
