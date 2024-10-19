// world-countries

import {
	availableLanguageTags,
	languageTag,
	type AvailableLanguageTag
} from '$lib/paraglide/runtime';
import countries from 'world-countries';

const addressCountries = [
	{ iso_code: 'ZA' },
	{ iso_code: 'AT' },
	{ iso_code: 'IN' },
	{ iso_code: 'AF' },
	{ iso_code: 'AL' },
	{ iso_code: 'DE' },
	{ iso_code: 'AD' },
	{ iso_code: 'AO' },
	{ iso_code: 'AI' },
	{ iso_code: 'AQ' },
	{ iso_code: 'AG' },
	{ iso_code: 'AN' },
	{ iso_code: 'SA' },
	{ iso_code: 'DZ' },
	{ iso_code: 'AR' },
	{ iso_code: 'AM' },
	{ iso_code: 'AW' },
	{ iso_code: 'AU' },
	{ iso_code: 'AZ' },
	{ iso_code: 'BE' },
	{ iso_code: 'BA' },
	{ iso_code: 'BS' },
	{ iso_code: 'BD' },
	{ iso_code: 'BH' },
	{ iso_code: 'BB' },
	{ iso_code: 'BZ' },
	{ iso_code: 'BJ' },
	{ iso_code: 'BM' },
	{ iso_code: 'BY' },
	{ iso_code: 'MM' },
	{ iso_code: 'BO' },
	{ iso_code: 'BW' },
	{ iso_code: 'BR' },
	{ iso_code: 'BN' },
	{ iso_code: 'BG' },
	{ iso_code: 'BI' },
	{ iso_code: 'BF' },
	{ iso_code: 'BT' },
	{ iso_code: 'CV' },
	{ iso_code: 'CM' },
	{ iso_code: 'KH' },
	{ iso_code: 'CA' },
	{ iso_code: 'QA' },
	{ iso_code: 'KZ' },
	{ iso_code: 'TD' },
	{ iso_code: 'CL' },
	{ iso_code: 'CN' },
	{ iso_code: 'CY' },
	{ iso_code: 'CO' },
	{ iso_code: 'KM' },
	{ iso_code: 'CG' },
	{ iso_code: 'CD' },
	{ iso_code: 'KP' },
	{ iso_code: 'KR' },
	{ iso_code: 'CR' },
	{ iso_code: 'CI' },
	{ iso_code: 'HR' },
	{ iso_code: 'CU' },
	{ iso_code: 'DK' },
	{ iso_code: 'DM' },
	{ iso_code: 'EG' },
	{ iso_code: 'AE' },
	{ iso_code: 'EC' },
	{ iso_code: 'ER' },
	{ iso_code: 'SK' },
	{ iso_code: 'SI' },
	{ iso_code: 'ES' },
	{ iso_code: 'EE' },
	{ iso_code: 'US' },
	{ iso_code: 'ET' },
	{ iso_code: 'FO' },
	{ iso_code: 'FJ' },
	{ iso_code: 'PH' },
	{ iso_code: 'FI' },
	{ iso_code: 'FR' },
	{ iso_code: 'GM' },
	{ iso_code: 'GA' },
	{ iso_code: 'GH' },
	{ iso_code: 'GE' },
	{ iso_code: 'GS' },
	{ iso_code: 'GI' },
	{ iso_code: 'GR' },
	{ iso_code: 'GD' },
	{ iso_code: 'GL' },
	{ iso_code: 'GP' },
	{ iso_code: 'GU' },
	{ iso_code: 'GT' },
	{ iso_code: 'GY' },
	{ iso_code: 'GF' },
	{ iso_code: 'GN' },
	{ iso_code: 'GQ' },
	{ iso_code: 'GW' },
	{ iso_code: 'HT' },
	{ iso_code: 'HN' },
	{ iso_code: 'HK' },
	{ iso_code: 'HU' },
	{ iso_code: 'YE' },
	{ iso_code: 'BV' },
	{ iso_code: 'NF' },
	{ iso_code: 'CX' },
	{ iso_code: 'KY' },
	{ iso_code: 'CK' },
	{ iso_code: 'FK' },
	{ iso_code: 'HM' },
	{ iso_code: 'MH' },
	{ iso_code: 'UM' },
	{ iso_code: 'SB' },
	{ iso_code: 'TC' },
	{ iso_code: 'VI' },
	{ iso_code: 'VG' },
	{ iso_code: 'CC' },
	{ iso_code: 'ID' },
	{ iso_code: 'IR' },
	{ iso_code: 'IQ' },
	{ iso_code: 'IE' },
	{ iso_code: 'IS' },
	{ iso_code: 'IL' },
	{ iso_code: 'IT' },
	{ iso_code: 'JM' },
	{ iso_code: 'JP' },
	{ iso_code: 'DJ' },
	{ iso_code: 'JO' },
	{ iso_code: 'YU' },
	{ iso_code: 'KW' },
	{ iso_code: 'LB' },
	{ iso_code: 'LY' },
	{ iso_code: 'LA' },
	{ iso_code: 'LS' },
	{ iso_code: 'LV' },
	{ iso_code: 'LR' },
	{ iso_code: 'LI' },
	{ iso_code: 'LT' },
	{ iso_code: 'LU' },
	{ iso_code: 'MX' },
	{ iso_code: 'MC' },
	{ iso_code: 'MO' },
	{ iso_code: 'MK' },
	{ iso_code: 'MG' },
	{ iso_code: 'MY' },
	{ iso_code: 'MW' },
	{ iso_code: 'MV' },
	{ iso_code: 'ML' },
	{ iso_code: 'MT' },
	{ iso_code: 'MP' },
	{ iso_code: 'MA' },
	{ iso_code: 'MQ' },
	{ iso_code: 'MU' },
	{ iso_code: 'MR' },
	{ iso_code: 'YT' },
	{ iso_code: 'FM' },
	{ iso_code: 'MZ' },
	{ iso_code: 'MD' },
	{ iso_code: 'MN' },
	{ iso_code: 'MS' },
	{ iso_code: 'NE' },
	{ iso_code: 'NA' },
	{ iso_code: 'NR' },
	{ iso_code: 'NP' },
	{ iso_code: 'NI' },
	{ iso_code: 'NG' },
	{ iso_code: 'NU' },
	{ iso_code: 'NO' },
	{ iso_code: 'NC' },
	{ iso_code: 'NZ' },
	{ iso_code: 'OM' },
	{ iso_code: 'NL' },
	{ iso_code: 'PW' },
	{ iso_code: 'PA' },
	{ iso_code: 'PG' },
	{ iso_code: 'PK' },
	{ iso_code: 'PY' },
	{ iso_code: 'PE' },
	{ iso_code: 'PN' },
	{ iso_code: 'PL' },
	{ iso_code: 'PF' },
	{ iso_code: 'PR' },
	{ iso_code: 'PT' },
	{ iso_code: 'KE' },
	{ iso_code: 'KG' },
	{ iso_code: 'KI' },
	{ iso_code: 'RU' },
	{ iso_code: 'GB' },
	{ iso_code: 'CF' },
	{ iso_code: 'CZ' },
	{ iso_code: 'DO' },
	{ iso_code: 'RE' },
	{ iso_code: 'RO' },
	{ iso_code: 'RW' },
	{ iso_code: 'KN' },
	{ iso_code: 'SM' },
	{ iso_code: 'PM' },
	{ iso_code: 'ST' },
	{ iso_code: 'VC' },
	{ iso_code: 'SY' },
	{ iso_code: 'SV' },
	{ iso_code: 'WS' },
	{ iso_code: 'AS' },
	{ iso_code: 'SH' },
	{ iso_code: 'LC' },
	{ iso_code: 'EH' },
	{ iso_code: 'SC' },
	{ iso_code: 'SN' },
	{ iso_code: 'SL' },
	{ iso_code: 'SG' },
	{ iso_code: 'SO' },
	{ iso_code: 'LK' },
	{ iso_code: 'SE' },
	{ iso_code: 'CH' },
	{ iso_code: 'SZ' },
	{ iso_code: 'SD' },
	{ iso_code: 'SR' },
	{ iso_code: 'SJ' },
	{ iso_code: 'TH' },
	{ iso_code: 'TW' },
	{ iso_code: 'TJ' },
	{ iso_code: 'TZ' },
	{ iso_code: 'IO' },
	{ iso_code: 'TF' },
	{ iso_code: 'TL' },
	{ iso_code: 'TG' },
	{ iso_code: 'TK' },
	{ iso_code: 'TO' },
	{ iso_code: 'TT' },
	{ iso_code: 'TN' },
	{ iso_code: 'TM' },
	{ iso_code: 'TR' },
	{ iso_code: 'TV' },
	{ iso_code: 'UA' },
	{ iso_code: 'UG' },
	{ iso_code: 'UY' },
	{ iso_code: 'UZ' },
	{ iso_code: 'VU' },
	{ iso_code: 'VA' },
	{ iso_code: 'VE' },
	{ iso_code: 'VN' },
	{ iso_code: 'WF' },
	{ iso_code: 'ZM' },
	{ iso_code: 'ZW' }
];

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

// we build an index of country codes to translation objects
type TranslationObject = { [key in AvailableLanguageTag]: string };
const countryIso3ToLocalNamesMap = new Map<string, TranslationObject>();

for (const country of addressCountries) {
	const translationObject: TranslationObject = {} as any;
	for (const languageTag of availableLanguageTags) {
		translationObject[languageTag] = countryCodeToLocalName(country.iso_code, languageTag);
	}
	countryIso3ToLocalNamesMap.set(country.iso_code, translationObject);
}

// we use that index to build the options for the form
export const translatedCountryCodeFormOptions = $state(
	addressCountries
		.map((country) => ({
			value: country.iso_code,
			label: countryIso3ToLocalNamesMap.get(country.iso_code)![languageTag()]
		}))
		.sort((a, b) => a.label.localeCompare(b.label))
);
