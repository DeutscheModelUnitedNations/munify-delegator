import { object, query, schemaBuilder } from '#api/rumble';
import { refreshSchoolSuggestions } from './schoolSuggestions';
import {
	assertCanAnalyzeSchoolSuggestions,
	readableSchoolRegistrations,
	registerSchoolSuggestionAbilities
} from './schoolSuggestionPermissions';
import { schoolSuggestionPubsub } from '#api/pubsub';
import { updateIfAllowed } from '#api/services/authHelper/utils';

registerSchoolSuggestionAbilities();

object({ table: 'schoolSuggestion' });
object({ table: 'schoolSuggestionVariant' });
query({ table: 'schoolSuggestion' });

schemaBuilder.mutationFields((t) => ({
	analyzeSchoolSuggestions: t.field({
		description:
			"Looks for groups of similar school names among the people of the conference's applications (participant care) and brings the suggestions in line with them: a group found again keeps its decision, groups no longer found are removed.",
		type: 'Boolean',
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanAnalyzeSchoolSuggestions({ ctx, conferenceId: args.conferenceId });
			await refreshSchoolSuggestions({
				conferenceId: args.conferenceId,
				readable: await readableSchoolRegistrations({ ctx, conferenceId: args.conferenceId })
			});
			return true;
		}
	}),

	dismissSchoolSuggestion: t.field({
		description:
			'Marks a suggested group of similar school names as no duplicates (participant care), so it is not suggested again.',
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
