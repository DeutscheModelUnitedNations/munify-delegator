/**
 * Whether rumble's `PersonName` scalar will accept a name, so the form can say so before the
 * mutation does. Mirrors the scalar (`lib/scalars/personName.ts` in rumble): the typos it corrects
 * on its own - typographic apostrophes and dashes, stray whitespace, doubled separators - are not
 * held against the name here either. The scalar itself cannot be imported: rumble's entry point
 * pulls in the server.
 */
const NAME = /^[\p{L}\p{M}]+(?:(?:[ '-]|\.\x20?)[\p{L}\p{M}]+)*\.?$/u;

export function isPersonName(value: string): boolean {
	const normalized = value
		.normalize('NFC')
		.replace(/[\p{Cc}\p{Cf}]/gu, '')
		.replace(/[‘’ʼ´`]/gu, "'")
		.replace(/[‐-―−]/gu, '-')
		.replace(/\p{Zs}+/gu, ' ')
		.trim()
		.replace(/ ?- ?/gu, '-')
		.replace(/([-'])\1+/gu, '$1')
		.replace(/^[-']+|[-']+$/gu, '')
		.trim();
	return normalized.length > 0 && normalized.length <= 200 && NAME.test(normalized);
}
