import { error, redirect } from '@sveltejs/kit';
import { loadDoc } from '#lib/docs/content.server';
import { nav } from '#lib/docs/nav';
import { getLocale, localizeHref } from '#lib/paraglide/runtime';
import { m } from '#lib/paraglide/messages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const slug = params.slug.replace(/\/+$/, '');
	if (!slug) redirect(307, localizeHref(`/docs/${nav.defaultSlug}`));

	// Category pages (participant and team guide) have no markdown, they list their pages
	if (nav.findCategory(slug)) return { slug, doc: undefined };

	const locale = getLocale();
	const doc = loadDoc({ slug, locale });
	if (!doc) error(404, m.docsPageNotFound());
	return { slug, doc, fallback: doc.locale !== locale };
};
