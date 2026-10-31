import { z } from 'zod';

/** Splits a full name at its last word into given and family name; a single word is both. */
function splitFullName(fullName: string) {
	const words = fullName.trim().split(/\s+/);
	if (words.length < 2) return { givenName: fullName, familyName: fullName };
	return { givenName: words.slice(0, -1).join(' '), familyName: words.at(-1) };
}

/** A claim that is a string, or undefined when the provider omits it or sends something else. */
const optionalClaim = z.string().optional().catch(undefined);

/**
 * The provider's claims in the shape `upsertSelfFromClaims` expects, whichever provider sent them.
 * Logto uses `username` instead of `preferred_username`, and a single `name` instead of
 * `given_name`/`family_name`.
 *
 * TODO: make this part of the library
 */
export const providerClaims = z
	.object({
		sub: z.string().min(1),
		email: optionalClaim,
		locale: optionalClaim,
		preferred_username: optionalClaim,
		username: optionalClaim,
		name: optionalClaim,
		given_name: optionalClaim,
		family_name: optionalClaim,
		phone: optionalClaim
	})
	.transform(({ username, name, ...claims }) => {
		const hasSplitName = !!claims.given_name && !!claims.family_name;
		const { givenName, familyName } =
			!hasSplitName && name
				? splitFullName(name)
				: { givenName: claims.given_name, familyName: claims.family_name };
		return {
			...claims,
			preferred_username: claims.preferred_username ?? username,
			given_name: givenName,
			family_name: familyName
		};
	});
