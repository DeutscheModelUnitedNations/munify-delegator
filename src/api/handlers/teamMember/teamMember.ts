import { db, schema } from '#api/db/db.js';
import { enum_, object, countQuery, query, schemaBuilder } from '#api/rumble.js';
import { eq } from 'drizzle-orm';
import { assertFindFirstExists } from '@m1212e/rumble';
import { teamMemberPubsub } from '#api/pubsub.js';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';
import {
	assertCanChangeTeamRole,
	assertCanDeleteTeamMember,
	registerTeamMemberAbilities
} from './teamMemberPermissions';

registerTeamMemberAbilities();

const TeamMemberRef = object({ table: 'teamMember' });
const teamRoleEnum = enum_({ tsName: 'teamRole' });
query({ table: 'teamMember' });
countQuery({ table: 'teamMember' });

schemaBuilder.mutationFields((t) => ({
	/** Gives a team member another role, as the caller could invite somebody with it. */
	updateTeamMemberRole: t.drizzleField({
		type: TeamMemberRef,
		args: {
			id: t.arg.id({ required: true }),
			role: t.arg({ type: teamRoleEnum, required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanChangeTeamRole(ctx, args.id, args.role);
			await db
				.update(schema.teamMember)
				.set({ role: args.role })
				.where(eq(schema.teamMember.id, args.id));
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
			await assertCanDeleteTeamMember(ctx, args.id);

			const deleted = await db
				.delete(schema.teamMember)
				.where(eq(schema.teamMember.id, args.id))
				.returning({ id: schema.teamMember.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			teamMemberPubsub.removed();

			return true;
		}
	})
}));
