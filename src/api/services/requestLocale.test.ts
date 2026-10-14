import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages';
import { localeOfRequest, localeOfUser, runWithLocale } from './requestLocale';

const requestWith = (locale?: string) =>
	new Request('http://localhost/api/graphql', locale ? { headers: { 'x-locale': locale } } : {});

describe('localeOfRequest', () => {
	it('reads a supported locale from the header', () => {
		expect(localeOfRequest(requestWith('en'))).toBe('en');
	});

	it('ignores a missing or unsupported one', () => {
		expect(localeOfRequest(requestWith())).toBeUndefined();
		expect(localeOfRequest(requestWith('xx'))).toBeUndefined();
	});
});

describe('localeOfUser', () => {
	it('canonicalizes the stored locale', () => {
		expect(localeOfUser('EN')).toBe('en');
	});

	it('falls back to the current locale when the stored one is not spoken here', () => {
		expect(localeOfUser('fr')).toBe('de');
		expect(localeOfUser(null)).toBe('de');
	});
});

describe('runWithLocale', () => {
	it('still runs the callback when no request store exists', () => {
		expect(runWithLocale('en', () => m.emailGreetingAnonymous({}, { locale: 'en' }))).toBe(
			'Hello,'
		);
	});
});
