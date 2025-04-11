/**
 * Formats the given and family names based on specified options.
 *
 * The function formats the names by either applying uppercase or sentence case transformations.
 * If either name is missing, it handles them accordingly:
 * - If givenName is not provided, it returns the familyName in uppercase (or "unknown name" if familyName is also undefined).
 * - If familyName is not provided, it returns the givenName as is.
 *
 * The name order is determined by the givenNameFirst option:
 * - If true, the formatted string is "GivenName{delimiter}FamilyName".
 * - If false, the formatted string is "FamilyName{delimiter}GivenName".
 *
 * Additionally, any spaces within the formatted names are replaced with the provided delimiter.
 *
 * @param givenName - The given (or first) name. Its case is adjusted based on givenNameUppercase.
 * @param familyName - The family (or last) name. Its case is adjusted based on familyNameUppercase.
 * @param options - An object containing formatting options:
 *   @param options.givenNameFirst - If true, places the given name before the family name; otherwise, reverses the order.
 *   @param options.givenNameUppercase - If true, converts the given name to uppercase. Otherwise, applies sentence case.
 *   @param options.familyNameUppercase - If true, converts the family name to uppercase. Otherwise, applies sentence case.
 *   @param options.delimiter - The string to use as a delimiter for joining names and replacing spaces. Defaults to a single space.
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
		delimiter?: string;
	}
): string {
	const {
		givenNameFirst = true,
		givenNameUppercase = false,
		familyNameUppercase = true,
		delimiter = ' '
	} = options || {};

	const sentenceCase = (name: string) => {
		const words = name.trim().split(/\s+/);
		return words
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join(delimiter);
	};

	if (!givenName) {
		return familyName?.toUpperCase().replace(/ /g, delimiter) || 'unknown name';
	}
	if (!familyName) {
		return givenName.replace(/ /g, delimiter);
	}

	const formattedGivenName = givenNameUppercase
		? givenName.toUpperCase().replace(/ /g, delimiter)
		: sentenceCase(givenName);
	const formattedFamilyName = familyNameUppercase
		? familyName.toUpperCase().replace(/ /g, delimiter)
		: sentenceCase(familyName);

	if (givenNameFirst) return `${formattedGivenName}${delimiter}${formattedFamilyName}`;
	return `${formattedFamilyName}${delimiter}${formattedGivenName}`;
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
