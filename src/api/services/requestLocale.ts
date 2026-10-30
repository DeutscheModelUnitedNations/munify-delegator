import { LOCALE_HEADER } from '#lib/api/localeHeader';
import {
	getLocale,
	getServerAsyncLocalStorage,
	isLocale,
	toLocale,
	type Locale
} from '#lib/paraglide/runtime';

/**
 * The locale an API request asks for.
 *
 * Paraglide's `url` strategy finds the locale in the page's path, which `/api/graphql` does not
 * have, so without this every message built by a resolver would come out in the base locale.
 */
export function localeOfRequest(request: Request): Locale | undefined {
	const requested = request.headers.get(LOCALE_HEADER);
	return requested && isLocale(requested) ? requested : undefined;
}

/**
 * Runs `fn` with `locale` as the locale of everything that calls `getLocale()` inside it, which is
 * every `m.…()` message. Paraglide keeps the locale of a request in an `AsyncLocalStorage`; this
 * opens a nested store with another locale instead of writing to the request's own.
 */
export function runWithLocale<T>(locale: Locale, fn: () => T): T {
	const storage = getServerAsyncLocalStorage();
	if (!storage) return fn();
	const store = storage.getStore();
	return storage.run(
		{ locale, origin: store?.origin ?? '', messageCalls: store?.messageCalls ?? new Set() },
		fn
	);
}

/**
 * The locale to write to someone in, from the one saved on their account. Accounts keep whatever
 * their identity provider sent, which may be a locale the app does not speak; those, and people
 * without a stored one, get the language of the request that caused the mail.
 */
export function localeOfUser(stored: string | null | undefined): Locale {
	return toLocale(stored) ?? getLocale();
}
