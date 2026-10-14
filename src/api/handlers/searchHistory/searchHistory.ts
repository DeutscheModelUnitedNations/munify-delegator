import { object, query, schemaBuilder } from '$api/rumble';
import { searchHistoryPubsub } from '$api/pubsub';
import { assertCanRecordSearch, registerSearchHistoryAbilities } from './searchHistoryPermissions';
import { recordSearch } from './searchHistoryService';

registerSearchHistoryAbilities();

object({ table: 'searchHistory' });
query({ table: 'searchHistory' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Records a result the caller picked in the search. Picking the same result again moves it to
	 * the top instead of listing it twice, and only the newest entries are kept.
	 */
	recordSearch: t.field({
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			originId: t.arg.string({ required: true }),
			resultId: t.arg.string({ required: true }),
			label: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const userId = await assertCanRecordSearch(ctx, args.conferenceId);
			await recordSearch(userId, args);

			searchHistoryPubsub.created();
			return true;
		}
	})
}));
