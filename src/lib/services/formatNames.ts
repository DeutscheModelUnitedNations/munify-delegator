/**
 * Formats the given and family names based on specified options.
 *
 * The function formats the names by either applying uppercase or sentence case transformations.
 * If either name is missing, it handles them accordingly:
 * - If givenName is not provided, it returns the familyName in uppercase (or "unknown name" if familyName is also undefined).
 * - If familyName is not provided, it returns the givenName as is.
 *
 * The name order is determined by the givenNameFirst option:
 * - If true, the formatted string is "GivenName FamilyName".
 * - If false, the formatted string is "FamilyName, GivenName".
 *
 * @param givenName - The given (or first) name. Its case is adjusted based on givenNameUppercase.
 * @param familyName - The family (or last) name. Its case is adjusted based on familyNameUppercase.
 * @param options - An object containing formatting options:
 *   @param options.givenNameFirst - If true, places the given name before the family name; otherwise, reverses the order.
 *   @param options.givenNameUppercase - If true, converts the given name to uppercase. Otherwise, applies sentence case.
 *   @param options.familyNameUppercase - If true, converts the family name to uppercase. Otherwise, applies sentence case.
 *
 * @returns A formatted string of the names according to the provided options.
 */
export default function formatNames(
	givenName: string | undefined,
	familyName: string | undefined,
	options?: {
		givenNameFirst?: boolean;
		givenNameUppercase?: boolean;
		familyNameUppercase?: boolean;
	}
): string {
	const {
		givenNameFirst = true,
		givenNameUppercase = false,
		familyNameUppercase = true
	} = options || {};

	const sentenceCase = (name: string) => {
		const words = name.split(' ');
		return words
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(' ');
	};

	if (!givenName) return familyName?.toUpperCase() || 'unknown name';
	if (!familyName) return givenName;
	const formattedGivenName = givenNameUppercase ? givenName.toUpperCase() : sentenceCase(givenName);
	const formattedFamilyName = familyNameUppercase
		? familyName.toUpperCase()
		: sentenceCase(familyName);
	if (givenNameFirst) return `${formattedGivenName} ${formattedFamilyName}`;
	return `${formattedFamilyName}, ${formattedGivenName}`;
}

/**
 * Generates formatted initials from the provided given and family names.
 *
 * If the given name is not provided, the function returns the uppercase form of the family name,
 * or a placeholder '--' if the family name is also not provided. If the family name is missing,
 * it returns the uppercase first character of the given name. When both names are available,
 * it concatenates the uppercase first characters of both names.
 *
 * @param givenName - The given name of the individual. Can be undefined.
 * @param familyName - The family name of the individual. Can be undefined.
 * @returns The formatted initials derived from the input names.
 */
export function formatInitials(
	givenName: string | undefined,
	familyName: string | undefined
): string {
	if (!givenName) return familyName?.toUpperCase() || '--';
	if (!familyName) return givenName.charAt(0).toUpperCase();
	return `${givenName.charAt(0).toUpperCase()}${familyName.charAt(0).toUpperCase()}`;
}

export function sortByNames(
	a: { given_name: string; family_name: string },
	b: { given_name: string; family_name: string }
): number {
	const aName = formatNames(a.given_name, a.family_name, { givenNameFirst: false });
	const bName = formatNames(b.given_name, b.family_name, { givenNameFirst: false });
	return aName.localeCompare(bName);
}
