import { object, query, schemaBuilder } from '#api/rumble';
import { assertCanRecordSearch, registerSearchHistoryAbilities } from './searchHistoryPermissions';
import { recordSearch, recordSearchSchemas } from './searchHistoryService';

registerSearchHistoryAbilities();

object({ table: 'searchHistory' });
query({ table: 'searchHistory' });

schemaBuilder.mutationFields((t) => ({
	recordSearch: t.field({
		description:
			'Records a result the caller picked in the search. Picking the same result again moves it to the top instead of listing it twice, and only the newest entries are kept.',
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			originId: t.arg.string({ required: true }),
			resultId: t.arg.string({ required: true }).validate(recordSearchSchemas.resultId),
			label: t.arg.string({ required: true }).validate(recordSearchSchemas.label)
		},
		resolve: async (_root, args, ctx) => {
			const { userId } = await assertCanRecordSearch({ ctx, conferenceId: args.conferenceId });
			await recordSearch({ userId, args });
			return true;
		}
	})
}));
