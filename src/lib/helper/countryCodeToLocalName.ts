import countries from 'world-countries';
import { languageTag } from '$lib/paraglide/runtime.js'

//TODO this could probably be part of the localization engine
function countryCodeToLocalName(alpha2Code: string, locale = languageTag()) {
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

	const country = countries.find((country) => country.cca2 === alpha2Code.toUpperCase())
		?.translations[getTranslationCode(locale)];
	if (country) {
		return country.common;
	}
	return "N/A"
}

export default countryCodeToLocalName;
