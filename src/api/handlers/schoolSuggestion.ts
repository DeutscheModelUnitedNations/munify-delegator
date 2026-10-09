import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { refreshSchoolSuggestions } from '$api/services/schoolSuggestions';

abilityBuilder.schoolSuggestion.allow(['read', 'update']).when(systemAdmin);
abilityBuilder.schoolSuggestionVariant.allow('read').when(systemAdmin);

// The cleanup page belongs to the people who manage the participants.
abilityBuilder.schoolSuggestion
	.allow(['read', 'update'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
abilityBuilder.schoolSuggestionVariant.allow('read').when((ctx) => {
	const conference = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return conference ? { where: { suggestion: conference } } : undefined;
});

object({ table: 'schoolSuggestion' });
object({ table: 'schoolSuggestionVariant' });
query({ table: 'schoolSuggestion' });
const pubsub = rumblePubsub({ table: 'schoolSuggestion' });
const variantPubsub = rumblePubsub({ table: 'schoolSuggestionVariant' });

schemaBuilder.mutationFields((t) => ({
	/** Looks for similar school names in the conference and fills the suggestion tables. */
	analyzeSchoolSuggestions: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			await refreshSchoolSuggestions(args.conferenceId, ctx);
			pubsub.updated();
			variantPubsub.updated();
			return true;
		}
	}),

	dismissSchoolSuggestion: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await db
				.update(schema.schoolSuggestion)
				.set({ dismissed: true })
				.where(
					(await ctx.abilities.schoolSuggestion.filter('update')).merge({ where: { id: args.id } })
						.sql.where
				);
			pubsub.updated(args.id);
			return true;
		}
	})
}));
