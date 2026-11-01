const replacements: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

/**
 * Escapes text for insertion into HTML. Use it for values interpolated into a translation that is
 * rendered with `{@html}` because the translation itself carries markup.
 */
export function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (char) => replacements[char] ?? char);
}
