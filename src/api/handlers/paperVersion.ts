import { abilityBuilder, object, query } from '$api/rumble';
import { hashEditorContent } from '$lib/components/paper/editor/contentHash';
import {
	PAPER_ROLES,
	isParticipantOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';

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

// Supervisors and participants read what they may read of the paper itself: the submitted text,
// never a draft. Without these the public paper view and the supervisor view load a paper with
// no versions, i.e. without its content.
abilityBuilder.paperVersion.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					status: { ne: 'DRAFT' },
					paper: {
						status: { ne: 'DRAFT' },
						delegation: { members: { supervisors: { user: { id } } } }
					}
				}
			}
		: undefined;
});

abilityBuilder.paperVersion.allow('read').when((ctx) => {
	const participant = isParticipantOfConference(ctx);
	return participant
		? { where: { status: { ne: 'DRAFT' }, paper: { ...participant, status: { ne: 'DRAFT' } } } }
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
