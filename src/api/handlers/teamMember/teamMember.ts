import { db } from '#api/db/db';
import { enum_, object, countQuery, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { teamMemberPubsub } from '#api/pubsub';
import { assertCanChangeTeamRole, registerTeamMemberAbilities } from './teamMemberPermissions';
import { deleteIfAllowed } from '#api/services/authHelper/utils';
import { changeTeamRole } from './teamMemberService';

registerTeamMemberAbilities();

const TeamMemberRef = object({ table: 'teamMember' });
const teamRoleEnum = enum_({ tsName: 'teamRole' });
query({ table: 'teamMember' });
countQuery({ table: 'teamMember' });

schemaBuilder.mutationFields((t) => ({
	updateTeamMemberRole: t.drizzleField({
		description:
			'Gives a team member another role. Project management changes anybody on its team; team coordinators anybody but project management, and never to project management. NOT_FOUND for a member the caller may not change, FORBIDDEN for a role they may not hand out.',
		type: TeamMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			role: t.arg({ type: teamRoleEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanChangeTeamRole({ ctx, id: args.id, role: args.role });
			await changeTeamRole({ id: args.id, role: args.role });

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
			"Removes someone from the conference's team: project management anybody, team coordinators anybody but project management. NOT_FOUND otherwise.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'teamMember', id: args.id });
			teamMemberPubsub.removed();

			return true;
		}
	})
}));
