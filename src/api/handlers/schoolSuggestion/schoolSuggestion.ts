import { db, schema } from '$api/db/db';
import { object, query, schemaBuilder } from '$api/rumble';
import { refreshSchoolSuggestions } from './schoolSuggestions';
import {
	assertCanAnalyzeSchoolSuggestions,
	readableSchoolRegistrations,
	registerSchoolSuggestionAbilities,
	updatableSchoolSuggestion
} from './schoolSuggestionPermissions';
import { schoolSuggestionPubsub, schoolSuggestionVariantPubsub } from '$api/pubsub';

registerSchoolSuggestionAbilities();

object({ table: 'schoolSuggestion' });
object({ table: 'schoolSuggestionVariant' });
query({ table: 'schoolSuggestion' });

schemaBuilder.mutationFields((t) => ({
	/** Looks for similar school names in the conference and fills the suggestion tables. */
	analyzeSchoolSuggestions: t.field({
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanAnalyzeSchoolSuggestions(ctx, args.conferenceId);
			await refreshSchoolSuggestions(
				args.conferenceId,
				await readableSchoolRegistrations(ctx, args.conferenceId)
			);
			schoolSuggestionPubsub.updated();
			schoolSuggestionVariantPubsub.updated();
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
				.where(await updatableSchoolSuggestion(ctx, args.id));
			schoolSuggestionPubsub.updated(args.id);
			return true;
		}
	})
}));
