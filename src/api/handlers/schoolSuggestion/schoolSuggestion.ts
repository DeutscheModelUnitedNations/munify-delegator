import { object, query, schemaBuilder } from '#api/rumble';
import { refreshSchoolSuggestions } from './schoolSuggestions';
import {
	assertCanAnalyzeSchoolSuggestions,
	readableSchoolRegistrations,
	registerSchoolSuggestionAbilities
} from './schoolSuggestionPermissions';
import { schoolSuggestionPubsub, schoolSuggestionVariantPubsub } from '#api/pubsub';
import { updateIfAllowed } from '#api/services/authHelper/utils';

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
			await assertCanAnalyzeSchoolSuggestions({ ctx, conferenceId: args.conferenceId });
			await refreshSchoolSuggestions({
				conferenceId: args.conferenceId,
				readable: await readableSchoolRegistrations({ ctx, conferenceId: args.conferenceId })
			});
			schoolSuggestionPubsub.updated();
			schoolSuggestionVariantPubsub.updated();
			return true;
		}
	}),

	dismissSchoolSuggestion: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await updateIfAllowed({
				ctx,
				table: 'schoolSuggestion',
				id: args.id,
				values: { dismissed: true }
			});
			schoolSuggestionPubsub.updated(args.id);
			return true;
		}
	})
}));
