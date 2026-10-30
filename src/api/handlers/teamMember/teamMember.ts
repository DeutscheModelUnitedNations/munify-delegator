import { db, schema } from '#api/db/db';
import { enum_, object, countQuery, query, schemaBuilder } from '#api/rumble';
import { eq } from 'drizzle-orm';
import { assertFindFirstExists } from '@m1212e/rumble';
import { teamMemberPubsub } from '#api/pubsub';
import { assertCanChangeTeamRole, registerTeamMemberAbilities } from './teamMemberPermissions';
import { deleteAllowedRow, readableById } from '#api/services/authHelper';

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
				.findFirst(query(await readableById(ctx.abilities.teamMember, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteTeamMember: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteAllowedRow(ctx, 'teamMember', args.id);
			teamMemberPubsub.removed();

			return true;
		}
	})
}));
