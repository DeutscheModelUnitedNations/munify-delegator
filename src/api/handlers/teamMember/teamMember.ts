import { db, schema } from '$api/db/db';
import { object, countQuery, query, schemaBuilder } from '$api/rumble';
import { eq } from 'drizzle-orm';
import { teamMemberPubsub } from '$api/pubsub';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';
import { assertCanDeleteTeamMember, registerTeamMemberAbilities } from './teamMemberPermissions';

registerTeamMemberAbilities();

object({ table: 'teamMember' });
query({ table: 'teamMember' });
countQuery({ table: 'teamMember' });

schemaBuilder.mutationFields((t) => ({
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
