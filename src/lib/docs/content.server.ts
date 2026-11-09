import { createDocsContent } from '@deutschemodelunitednations/docs-kit';
import { baseLocale, localizeHref, type Locale } from '#lib/paraglide/runtime';
import { renderDelegatorDoc } from './render';

/**
 * The manual's pages: markdown in `docs/<locale>/` at the repository root (`docs/review/` holds internal notes), bundled into the
 * server build. A page missing in a locale falls back to German.
 */
const content = createDocsContent<Locale>({
	sources: import.meta.glob<string>('/docs/{de,en}/**/*.md', {
		query: '?raw',
		import: 'default',
		eager: true
	}),
	baseLocale,
	render: ({ source, slug, locale }) =>
		renderDelegatorDoc({ source, slug, locale, basePath: localizeHref('/docs', { locale }) })
});

export const { loadDoc, docTitles } = content;
