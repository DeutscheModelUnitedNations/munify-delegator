import countries from 'world-countries';
import { languageTag } from '$lib/paraglide/runtime.js';

//TODO this could probably be part of the localization engine
function countryCodeToLocalName(code: string, locale = languageTag(), official = false) {
	const getTranslationCode = (locale: string) => {
		switch (locale) {
			case 'de':
				return 'deu';
			case 'en':
				return 'eng';
			default:
				return 'eng';
		}
	};

	const country = countries.find((country) => {
		if (code.length === 2) return country.cca2 === code.toUpperCase();
		return country.cca3 === code.toUpperCase();
	});

	if (country) {
		let translation;

		if (getTranslationCode(locale) == 'eng') {
			translation = country.name;
		} else {
			translation = country.translations[getTranslationCode(locale)];
		}

		if (official) {
			return translation.official;
		}
		return translation.common;
	}
	return 'N/A';
}

export default countryCodeToLocalName;
