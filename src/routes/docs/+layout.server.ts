import { docTitles } from '#lib/docs/content.server';
import { getLocale } from '#lib/paraglide/runtime';
import type { LayoutServerLoad } from './$types';

// The manual is markdown bundled into the server build, not API data: its titles and pages come
// from server loads (`#lib/docs/content.server`), the one kind of load the app keeps for content.
export const load: LayoutServerLoad = () => ({
	titles: docTitles(getLocale())
});
