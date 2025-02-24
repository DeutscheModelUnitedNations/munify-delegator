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
