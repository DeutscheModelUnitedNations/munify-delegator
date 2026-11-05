import { createDocsNav, type DocsNavEntry } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * Sidebar structure of the user manual. Page titles come from each markdown file's frontmatter,
 * so only the order and the category labels live here. Slugs are paths below `docs/<locale>/`
 * without the `.md` extension; `docs.test.ts` fails when a markdown file is missing here, or the
 * other way round.
 */
const entries: DocsNavEntry[] = [
	'user-manual/introduction',
	{
		slug: 'user-manual/participant',
		label: () => m.docsParticipantGuide(),
		description: () => m.docsParticipantGuideDescription(),
		items: ['user-manual/participant/registration', 'user-manual/participant/dashboard']
	},
	{
		slug: 'user-manual/team',
		label: () => m.docsTeamGuide(),
		description: () => m.docsTeamGuideDescription(),
		items: [
			'user-manual/team/configuration',
			'user-manual/team/assignment',
			'user-manual/team/ai-access'
		]
	}
];

export const nav = createDocsNav({ entries, defaultSlug: 'user-manual/introduction' });
