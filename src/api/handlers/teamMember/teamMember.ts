import { db, schema } from '#api/db/db';
import { enum_, object, countQuery, query, schemaBuilder } from '#api/rumble';
import { whereRows } from '#api/db/whereRows';
import { assertFindFirstExists } from '@m1212e/rumble';
import { teamMemberPubsub } from '#api/pubsub';
import { assertCanChangeTeamRole, registerTeamMemberAbilities } from './teamMemberPermissions';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerTeamMemberAbilities();

const TeamMemberRef = object({ table: 'teamMember' });
const teamRoleEnum = enum_({ tsName: 'teamRole' });
query({ table: 'teamMember' });
countQuery({ table: 'teamMember' });

schemaBuilder.mutationFields((t) => ({
	updateTeamMemberRole: t.drizzleField({
		description: 'Gives a team member another role, as the caller could invite somebody with it.',
		type: TeamMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			role: t.arg({ type: teamRoleEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanChangeTeamRole({ ctx, id: args.id, role: args.role });
			await db
				.update(schema.teamMember)
				.set({ role: args.role })
				.where(whereRows({ table: schema.teamMember, filter: { id: args.id } }));
			teamMemberPubsub.updated(args.id);

			return db.query.teamMember
				.findFirst(
					query(
						(await ctx.abilities.teamMember.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteTeamMember: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'teamMember', id: args.id });
			teamMemberPubsub.removed();

			return true;
		}
	})
}));
