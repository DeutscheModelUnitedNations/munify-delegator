import { object } from '#api/rumble';
import { hashEditorContent } from '#lib/components/paper/editor/contentHash';
import { registerPaperVersionAbilities } from './paperVersionPermissions';

registerPaperVersionAbilities();

object({
	table: 'paperVersion',
	adjust: (t) => ({
		contentHash: t.field({
			description:
				'Lets the editor tell whether the version it holds still matches the stored one: the hash of `JSON.stringify(content)`, which the editor computes over its own content the same way (`hashEditorContent`). Empty for a version without content.',
			type: 'String',
			resolve: async (version) =>
				version.content ? await hashEditorContent(JSON.stringify(version.content)) : ''
		})
	})
});
