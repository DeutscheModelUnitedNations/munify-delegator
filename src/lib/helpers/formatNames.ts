function toTitleCaseNamePart(namePart: string): string {
	if (!namePart) {
		return '';
	}

	const lowercaseParticles = new Set([
		'von',
		'van',
		'der',
		'de',
		'des',
		'di',
		'da',
		'dos',
		'do',
		'du',
		'le',
		'la',
		'y',
		'e',
		'af',
		'ter',
		'zu'
	]);

	const words = namePart.split(' ');

	return words
		.map((word) => {
			const lowercasedWord = word.toLowerCase();
			if (word.includes('-')) {
				return word
					.split('-')
					.map((part) => toTitleCaseNamePart(part))
					.join('-');
			}

			if (word.includes("'")) {
				return word
					.split("'")
					.map((part, partIndex) =>
						partIndex === 0 ? toTitleCaseNamePart(part) : toTitleCaseNamePart(part)
					)
					.join("'");
			}

			if (lowercaseParticles.has(lowercasedWord)) {
				if (word.charAt(0) === word.charAt(0).toUpperCase()) {
					return word.charAt(0) + word.slice(1).toLowerCase();
				}
				return word.toLowerCase();
			}

			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join(' ');
}

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
	const defaultOptions = {
		givenNameFirst: true, // Default to given name first
		givenNameUppercase: false,
		familyNameUppercase: false,
		delimiter: ' ' // Default delimiter is a space
	};
	const effectiveOptions = { ...defaultOptions, ...options };

	const formattedGivenName = formatNamePart(givenName, effectiveOptions.givenNameUppercase);
	const formattedFamilyName = formatNamePart(familyName, effectiveOptions.familyNameUppercase);

	// A missing name leaves the other one standing alone, without a delimiter.
	const ordered = effectiveOptions.givenNameFirst
		? [formattedGivenName, formattedFamilyName]
		: [formattedFamilyName, formattedGivenName];
	// String(): an explicitly undefined delimiter is spelled out, as a template literal would.
	return ordered.filter((name) => name.length > 0).join(String(effectiveOptions.delimiter));
}

/**
 * One trimmed name part, in title case (with the usual lowercase particles) or, when asked to,
 * fully uppercased from the original spelling.
 */
function formatNamePart(name: string | undefined, uppercase: boolean): string {
	const normalized = name ? name.trim() : '';
	return uppercase ? normalized.toUpperCase() : toTitleCaseNamePart(normalized);
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

type NameObject = {
	givenName: string | null | undefined;
	familyName: string | null | undefined;
};

export function sortByNames(a: NameObject, b: NameObject): number {
	const aName = formatNames(a.givenName ?? undefined, a.familyName ?? undefined, {
		givenNameFirst: false
	});
	const bName = formatNames(b.givenName ?? undefined, b.familyName ?? undefined, {
		givenNameFirst: false
	});
	return aName.localeCompare(bName);
}
