import { renderDoc } from '@deutschemodelunitednations/docs-kit';

/** FontAwesome style of the app's icons, also used by the manual's admonitions */
export const DOCS_ICON_PREFIX = 'fa-sharp-duotone fa-solid';

/**
 * Renders one manual page for a reader of `locale` (which decides the screenshots' language).
 * `basePath` is where the manual is in that locale (`/en/docs`), so links between pages keep it.
 */
export function renderDelegatorDoc({
	source,
	slug,
	locale,
	basePath = '/docs'
}: {
	source: string;
	slug: string;
	locale: string;
	basePath?: string;
}) {
	return renderDoc({ source, slug, locale, basePath, iconPrefix: DOCS_ICON_PREFIX });
}
