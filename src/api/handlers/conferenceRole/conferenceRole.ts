import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { nonStateActorUpdateData } from '#api/handlers/seatPlanning/seatPlanningService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { conferenceRolePubsub, roleApplicationPubsub, singleParticipantPubsub } from '#api/pubsub';
import {
	assertCanCreateConferenceRole,
	assertCanDeleteConferenceRole,
	assertCanUpdateConferenceRole,
	registerConferenceRoleAbilities
} from './conferenceRolePermissions';
import {
	createCustomRole,
	createNonStateActor,
	deleteCustomRole,
	deleteNonStateActor,
	updateCustomRole,
	updateNonStateActor
} from './conferenceRoleService';
import { queryAllowed } from '#api/services/authHelper/utils';

registerConferenceRoleAbilities();

const ConferenceRoleRef = object({ table: 'conferenceRole' });
query({ table: 'conferenceRole' });

/**
 * Creates a role of the seat planning (a non-state actor, a custom role), announces it, and
 * answers how to read it back.
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
	conferenceRolePubsub.created();
	return queryAllowed({ ability: ctx.abilities.conferenceRole, id: createdId });
}

schemaBuilder.mutationFields((t) => {
	/** What every role the seat planning creates names: its conference, name, icon and seats. */
	const plannedRoleArgs = () => ({
		conferenceId: t.arg.id({ required: true }),
		name: t.arg.string({ required: true }),
		fontAwesomeIcon: t.arg.string(),
		seatAmount: t.arg.int({ required: true })
	});

	return {
		createNonStateActor: t.drizzleField({
			type: ConferenceRoleRef,
			args: {
				...plannedRoleArgs(),
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
				seatAmount: t.arg.int()
			},
			resolve: async (query, _root, args, ctx) => {
				const data = nonStateActorUpdateData(args);
				const before = await assertCanUpdateConferenceRole({
					ctx,
					id: args.id,
					kind: 'NON_STATE_ACTOR'
				});
				const { applicationsTidied } = await updateNonStateActor({ before, data });

				conferenceRolePubsub.updated(args.id);
				if (applicationsTidied) roleApplicationPubsub.removed();

				return db.query.conferenceRole
					.findFirst(
						query(await queryAllowed({ ability: ctx.abilities.conferenceRole, id: args.id }))
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

				conferenceRolePubsub.removed();
				roleApplicationPubsub.removed();

				return true;
			}
		}),

		/** A custom role for single participants, such as the press, with how many it seats. */
		createCustomRole: t.drizzleField({
			type: ConferenceRoleRef,
			args: { ...plannedRoleArgs(), description: t.arg.string() },
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
				seatAmount: t.arg.int()
			},
			resolve: async (query, _root, { id, ...data }, ctx) => {
				await assertCanUpdateConferenceRole({ ctx, id, kind: 'CUSTOM' });
				await updateCustomRole({ id, data });

				conferenceRolePubsub.updated(id);

				return db.query.conferenceRole
					.findFirst(query(await queryAllowed({ ability: ctx.abilities.conferenceRole, id })))
					.then(assertFindFirstExists);
			}
		}),

		deleteCustomRole: t.field({
			type: 'Boolean',
			args: { id: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				await assertCanDeleteConferenceRole({ ctx, id: args.id, kind: 'CUSTOM' });
				await deleteCustomRole(args.id);

				conferenceRolePubsub.removed();
				singleParticipantPubsub.updated();

				return true;
			}
		})
	};
});
