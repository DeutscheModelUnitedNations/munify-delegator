import { object } from '#api/rumble';
import { hashEditorContent } from '#lib/components/paper/editor/contentHash';
import { registerPaperVersionAbilities } from './paperVersionPermissions';

registerPaperVersionAbilities();

object({
	table: 'paperVersion',
	adjust: (t) => ({
		/**
		 * Lets the editor tell whether the version it holds still matches the stored one.
		 *
		 * The editor compares this against `md5(JSON.stringify(itsContent))`, so the column - a
		 * jsonb object - has to be stringified here too. The Pothos resolver asserted the column
		 * to `string` and hashed the object itself, which could never match.
		 */
		contentHash: t.field({
			type: 'String',
			resolve: async (version) =>
				version.content ? await hashEditorContent(JSON.stringify(version.content)) : ''
		})
	})
});
