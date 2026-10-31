import { db } from '#api/db/db';
import { enum_, object, countQuery, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanChangeTeamRole,
	assertCanRemoveTeamMember,
	mustKeepProjectManagement,
	registerTeamMemberAbilities
} from './teamMemberPermissions';
import { changeTeamRole, removeTeamMember } from './teamMemberService';

registerTeamMemberAbilities();

const TeamMemberRef = object({ table: 'teamMember' });
const teamRoleEnum = enum_({ tsName: 'teamRole' });
query({ table: 'teamMember' });
countQuery({ table: 'teamMember' });

schemaBuilder.mutationFields((t) => ({
	updateTeamMemberRole: t.drizzleField({
		description:
			'Gives a team member another role. Project management changes anybody on its team; team coordinators anybody but project management, and never to project management. NOT_FOUND for a member the caller may not change, FORBIDDEN for a role they may not hand out, CONFLICT for demoting the last project management (only a system admin may).',
		type: TeamMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			role: t.arg({ type: teamRoleEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanChangeTeamRole({ ctx, id: args.id, role: args.role });
			await changeTeamRole({
				id: args.id,
				role: args.role,
				keepProjectManagement: mustKeepProjectManagement(ctx)
			});

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
		description:
			"Removes someone from the conference's team: project management anybody, team coordinators anybody but project management. NOT_FOUND otherwise; CONFLICT for the last project management (only a system admin may remove them).",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanRemoveTeamMember({ ctx, id: args.id });
			await removeTeamMember({
				id: args.id,
				keepProjectManagement: mustKeepProjectManagement(ctx)
			});
			return true;
		}
	})
}));
