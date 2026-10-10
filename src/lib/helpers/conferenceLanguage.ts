import allNations from 'world-countries';

/** The language a conference falls back to, and the one older free-text values read as. */
const DEFAULT_CONFERENCE_LANGUAGE = 'deu';

/**
 * The languages a conference can be held in: English and every language the nation list has
 * names for, as ISO 639-3 codes (the keys world-countries translates by).
 */
export const CONFERENCE_LANGUAGES = [
	...new Set(['eng', ...allNations.flatMap((nation) => Object.keys(nation.translations))])
].sort();

export function isConferenceLanguage(value: string) {
	return CONFERENCE_LANGUAGES.includes(value);
}

/** The stored language, or German when none or an unknown (older, free-text) one is stored. */
export function normalizeConferenceLanguage(value: string | null | undefined) {
	return value && isConferenceLanguage(value) ? value : DEFAULT_CONFERENCE_LANGUAGE;
}

/** The name of `language` in `inLocale`, falling back to the code itself. */
export function conferenceLanguageName(language: string, inLocale: string) {
	try {
		return new Intl.DisplayNames([inLocale], { type: 'language' }).of(language) ?? language;
	} catch {
		return language;
	}
}
