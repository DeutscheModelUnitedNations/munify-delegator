import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { seatCountSchema } from '#api/handlers/seatPlanning/seatRules';
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
	deleteCustomRole,
	deleteNonStateActor,
	updateConferenceRole
} from './conferenceRoleService';
import { customRoleSeatsSchema, nonStateActorUpdateData } from './plannedRoleRules';
import { mcpTool } from '#api/mcp/mcpTool';
import { iconArgSchema } from '#api/services/iconName';

registerConferenceRoleAbilities();

const ConferenceRoleRef = object({ table: 'conferenceRole' });
query({ table: 'conferenceRole' });

/** The role as the caller may read it, for re-reading the row a mutation wrote. */
const readableRole = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.conferenceRole.filter('read')).merge({ where: { id } }).query.single;

const iconDescription =
	'A Phosphor icon name (such as `leaf`), see phosphoricons.com; empty or left out shows none.';

/** What a custom role's people are in a linked CHASE (`docs/plans/chase-link.md`). */
const chaseAccessEnum = enum_({ tsName: 'chaseAccess' });

schemaBuilder.mutationFields((t) => {
	/** What every role the seat planning creates names: its conference, name, icon and seats. */
	const plannedRoleArgs = (seats: typeof seatCountSchema) => ({
		conferenceId: t.arg.id({ required: true }),
		name: t.arg.string({ required: true }),
		icon: t.arg.string({ description: iconDescription }).validate(iconArgSchema),
		seatAmount: t.arg
			.int({ required: true, description: 'How many people the role seats.' })
			.validate(seats)
	});

	return {
		createNonStateActor: t.drizzleField({
			extensions: mcpTool({
				textArguments: ['abbreviation', 'name', 'description', 'icon']
			}),
			description:
				'Adds a non-state actor to the conference, with how many seats it has. A name or abbreviation another role of the conference has is refused with CONFLICT.',
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
			extensions: mcpTool({
				textArguments: ['abbreviation', 'name', 'description', 'icon']
			}),
			description:
				'Changes the given fields of a non-state actor; left out or `null` keeps a field, an empty `icon` clears the icon. Lowering its seats drops the applications that no longer fit; lowering them below the members of the delegation assigned to it is refused with CONFLICT. A name or abbreviation another role of the conference has is refused with CONFLICT.',
			type: ConferenceRoleRef,
			args: {
				id: t.arg.id({ required: true }),
				name: t.arg.string(),
				abbreviation: t.arg.string(),
				description: t.arg.string(),
				icon: t.arg.string({ description: iconDescription }).validate(iconArgSchema),
				seatAmount: t.arg.int().validate(seatCountSchema.nullish())
			},
			resolve: async (query, _root, { id, ...args }, ctx) => {
				const before = await assertCanUpdateConferenceRole({ ctx, id, kind: 'NON_STATE_ACTOR' });
				await updateConferenceRole({ before, data: nonStateActorUpdateData(args) });

				return db.query.conferenceRole
					.findFirst(query(await readableRole({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		deleteNonStateActor: t.field({
			extensions: mcpTool(),
			description:
				'Deletes a non-state actor, together with the applications for it and its place in the assignment draft. Refused with CONFLICT while a delegation is assigned to it.',
			type: 'Boolean',
			args: { id: t.arg.id({ required: true }) },
			resolve: async (_root, args, ctx) => {
				await assertCanDeleteConferenceRole({ ctx, id: args.id, kind: 'NON_STATE_ACTOR' });
				await deleteNonStateActor(args.id);

				return true;
			}
		}),

		createCustomRole: t.drizzleField({
			extensions: mcpTool({ textArguments: ['name', 'description', 'icon'] }),
			description:
				'Adds a custom role for single participants, such as the press, with how many it seats. A name another role of the conference has is refused with CONFLICT.',
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
			extensions: mcpTool({ textArguments: ['name', 'description', 'icon'] }),
			description:
				'Changes the given fields of a custom role; left out keeps a field, `null` clears the description or icon, an empty name keeps the old one. Seats below the people already holding it are refused with CONFLICT, as is a name another role of the conference has. `chaseAccess` is what its people are in a linked CHASE.',
			type: ConferenceRoleRef,
			args: {
				id: t.arg.id({ required: true }),
				name: t.arg.string(),
				description: t.arg.string(),
				icon: t.arg.string({ description: iconDescription }).validate(iconArgSchema),
				seatAmount: t.arg.int().validate(customRoleSeatsSchema.nullish()),
				chaseAccess: t.arg({ type: chaseAccessEnum })
			},
			resolve: async (query, _root, { id, ...data }, ctx) => {
				const before = await assertCanUpdateConferenceRole({ ctx, id, kind: 'CUSTOM' });
				await updateConferenceRole({
					before,
					data: {
						name: data.name || undefined,
						description: data.description,
						icon: data.icon,
						seatAmount: data.seatAmount ?? undefined,
						chaseAccess: data.chaseAccess ?? undefined
					}
				});

				return db.query.conferenceRole
					.findFirst(query(await readableRole({ ctx, id })))
					.then(assertFindFirstExists);
			}
		}),

		deleteCustomRole: t.field({
			extensions: mcpTool(),
			description:
				'Deletes a custom role, together with the wishes for it and its place in the assignment draft. Refused with CONFLICT while somebody holds it.',
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
