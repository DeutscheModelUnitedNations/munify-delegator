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

/** The role as the caller may read it, for re-reading the row a mutation wrote. */
const readableRole = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.conferenceRole.filter('read')).merge({ where: { id } }).query.single;

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
			description: 'Adds a non-state actor to the conference, with how many seats it has.',
			type: ConferenceRoleRef,
			args: {
				...plannedRoleArgs(seatCountSchema),
				abbreviation: t.arg.string({ required: true }),
				description: t.arg.string({ required: true })
			},
			resolve: async (query, _root, args, ctx) => {
				await assertCanCreateConferenceRole({ ctx, conferenceId: args.conferenceId });
				const createdId = await createNonStateActor(args);

				return db.query.conferenceRole
					.findFirst(query(await readableRole({ ctx, id: createdId })))
					.then(assertFindFirstExists);
			}
		}),

		updateNonStateActor: t.drizzleField({
			description:
				'Changes the given fields of a non-state actor. Lowering its seats drops the applications that no longer fit.',
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
					.findFirst(query(await readableRole({ ctx, id: args.id })))
					.then(assertFindFirstExists);
			}
		}),

		deleteNonStateActor: t.field({
			description:
				'Deletes a non-state actor unless a delegation is assigned to it, together with the applications for it.',
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
			resolve: async (query, _root, args, ctx) => {
				await assertCanCreateConferenceRole({ ctx, conferenceId: args.conferenceId });
				const createdId = await createCustomRole(args);

				return db.query.conferenceRole
					.findFirst(query(await readableRole({ ctx, id: createdId })))
					.then(assertFindFirstExists);
			}
		}),

		updateCustomRole: t.drizzleField({
			description:
				'Changes the given fields of a custom role. Its seats may not drop below the people already holding it.',
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
					.findFirst(query(await readableRole({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		deleteCustomRole: t.field({
			description: 'Deletes a custom role unless somebody holds it; the wishes for it go with it.',
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
