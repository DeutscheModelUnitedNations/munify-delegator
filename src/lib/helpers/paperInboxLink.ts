/**
 * Generates a URL with query parameters appended for the given user.
 *
 * This function appends URL-encoded user information as query parameters
 * to the provided base link. It includes the user's unique identifier and email.
 *
 * It is used to generate a link to the paper inbox with the user's information
 * as hidden fields.
 *
 * @param baseLink - The base URL to which the query parameters are added.
 * @param user - An object containing user information.
 * @param user.sub - The unique identifier of the user.
 * @param user.email - The email address of the user.
 * @returns A string representing the URL with appended and encoded user parameters.
 */
export default function generatePaperInboxLinkWithParams(
	baseLink: string,
	user: {
		sub: string;
		email: string;
	}
) {
	const extensions = `userId=${encodeURIComponent(user.sub)}&email=${encodeURIComponent(user.email)}`;
	return `${baseLink}?${extensions}`;
}
