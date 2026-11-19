import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * A reviewer's own text snippets (`snippets/+page.svelte`).
 */
export const paperhubSnippetsTour: Tour = {
	id: 'paperhub.paperhubSnippets',
	steps: [
		{
			title: () => m.tourPaperhubSnippetsIntroTitle(),
			body: () => m.tourPaperhubSnippetsIntroBody()
		},
		{
			anchor: 'paperhub.snippets.create',
			title: () => m.tourPaperhubSnippetsCreateTitle(),
			body: () => m.tourPaperhubSnippetsCreateBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.snippets.help',
			title: () => m.tourPaperhubSnippetsHelpTitle(),
			body: () => m.tourPaperhubSnippetsHelpBody(),
			side: 'bottom'
		},
		{
			anchor: 'paperhub.snippets.list',
			title: () => m.tourPaperhubSnippetsListTitle(),
			body: () => m.tourPaperhubSnippetsListBody(),
			side: 'top'
		}
	]
};
