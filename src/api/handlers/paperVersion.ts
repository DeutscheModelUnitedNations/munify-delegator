import { abilityBuilder, object, query } from '$api/rumble';
import { hashEditorContent } from '$lib/components/paper/editor/contentHash';
import { type TeamRole, systemAdmin, userId } from '$api/services/authHelper';

const PAPER_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

// Ported from abilities/entities/paper/paperVersion.ts
abilityBuilder.paperVersion.allow(['read', 'update', 'delete']).when(systemAdmin);

abilityBuilder.paperVersion.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { paper: { author: { id } } } } : undefined;
});

abilityBuilder.paperVersion.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					paper: {
						conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
					}
				}
			}
		: undefined;
});

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
query({ table: 'paperVersion' });
