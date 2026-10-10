import { getCountryData, getCountryFields } from 'lib-address/lite';
import { alpha3ToAlpha2 } from './countryCodes';

type Requirement = 'required' | 'optional' | undefined;

/**
 * How a country's addresses are written, from the same libaddressinput metadata rumble's
 * `AddressInput` validates against: which of postal code, city and region (state, province,
 * prefecture) it uses and needs, the postal code's pattern, and the regions to pick from.
 */
export type AddressRules = {
	zip: Requirement;
	city: Requirement;
	region: Requirement;
	zipPattern?: RegExp;
	regions: { value: string; label: string }[];
};

/** Germany's rules stand in until a country is picked, which is what most accounts pick. */
const FALLBACK_COUNTRY = 'DE';

export function addressRules(countryAlpha3: string | null | undefined): AddressRules {
	const alpha2 = (countryAlpha3 && alpha3ToAlpha2(countryAlpha3)) || FALLBACK_COUNTRY;
	const fields = getCountryFields(alpha2);
	const data = getCountryData(alpha2);
	return {
		zip: fields?.zip,
		city: fields?.city,
		region: fields?.state,
		zipPattern: data?.zip ? new RegExp(`^(?:${data.zip})$`, 'i') : undefined,
		regions: (data?.sub_regions ?? []).map((r) => ({ value: r.key, label: r.name }))
	};
}

export type AddressIssue = { path: 'zip' | 'city' | 'region'; kind: 'missing' | 'invalid' };

/** What keeps an address from passing `AddressInput`'s validation, field by field. */
export function addressIssues(address: {
	zip?: string | null;
	city?: string | null;
	region?: string | null;
	country?: string | null;
}): AddressIssue[] {
	const rules = addressRules(address.country);
	const issues: AddressIssue[] = [];
	const zip = address.zip?.trim();
	const region = address.region?.trim();

	if (rules.zip === 'required' && !zip) issues.push({ path: 'zip', kind: 'missing' });
	else if (zip && rules.zipPattern && !rules.zipPattern.test(zip)) {
		issues.push({ path: 'zip', kind: 'invalid' });
	}

	if (rules.city === 'required' && !address.city?.trim()) {
		issues.push({ path: 'city', kind: 'missing' });
	}

	if (rules.region === 'required' && !region) issues.push({ path: 'region', kind: 'missing' });
	else if (
		region &&
		rules.regions.length > 0 &&
		!rules.regions.some((r) => r.value.toUpperCase() === region.toUpperCase())
	) {
		issues.push({ path: 'region', kind: 'invalid' });
	}

	return issues;
}
