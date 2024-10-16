import Elysia, { t } from 'elysia';
import { isAvailableLanguageTag, languageTag } from '$lib/paraglide/runtime';

export const languageExtractor = new Elysia()
	.guard({
		cookie: t.Optional(
			t.Partial(
				t.Cookie({
					'paraglide:lang': t.String()
				})
			)
		)
	})
	.derive({ as: 'scoped' }, async ({ cookie: { 'paraglide:lang': languageTagCookie } }) => {
		if (!languageTagCookie?.value) {
			return { languageTag: languageTag() };
		}

		if (!isAvailableLanguageTag(languageTagCookie.value)) {
			console.warn(`Invalid language tag from user cookie: ${languageTagCookie.value}`);
			return { languageTag: languageTag() };
		}

		return { languageTag: languageTagCookie.value };
	});
