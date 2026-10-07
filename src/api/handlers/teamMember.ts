import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PROJECT_MANAGEMENT_ROLES,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { GraphQLError } from 'graphql';

abilityBuilder.teamMember.allow(['read', 'delete']).when(systemAdmin);

// Team members can see each other.
abilityBuilder.teamMember.allow('read').when((ctx) => where(isTeamMemberOfConference(ctx)));

// Project management removes anybody from the team.
abilityBuilder.teamMember
	.allow('delete')
	.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

// Team coordinators remove anybody but project management. Who joins, with which role, goes
// through invitations (see `assertMayGrantRole`).
abilityBuilder.teamMember.allow('delete').when((ctx) => {
	const team = isTeamMemberOfConference(ctx, ['TEAM_COORDINATOR']);
	return team ? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } } } : undefined;
});

object({ table: 'teamMember' });
query({ table: 'teamMember' });
const pubsub = rumblePubsub({ table: 'teamMember' });

schemaBuilder.mutationFields((t) => ({
	deleteTeamMember: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.teamMember)
				.where(
					(await ctx.abilities.teamMember.filter('delete')).merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.teamMember.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Team member not found, or not yours to delete');
			}
			pubsub.removed();

			return true;
		}
	})
}));
