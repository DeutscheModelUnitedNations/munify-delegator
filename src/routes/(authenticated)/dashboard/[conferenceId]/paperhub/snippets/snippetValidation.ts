import type { JSONContent } from '@tiptap/core';
import { m } from '$lib/paraglide/messages';
import { validatePlaceholders } from '$lib/helpers/snippetPlaceholders';
import { hasTextContent } from '../tiptapText';

/**
 * Why a reviewer snippet cannot be saved (`error`), and otherwise whether it contains
 * placeholders the reviewer should be told about.
 */
export function checkSnippet(
	name: string,
	content: JSONContent
): { error: string | null; hasPlaceholders: boolean } {
	const invalid = (error: string) => ({ error, hasPlaceholders: false });
	if (!name.trim()) return invalid(m.snippetNameRequired());
	if (!hasTextContent(content)) return invalid(m.snippetContentRequired());

	const validation = validatePlaceholders(content);
	if (validation.malformed.length > 0) return invalid(m.malformedPlaceholders());
	if (validation.empty.length > 0) return invalid(m.emptyPlaceholders());
	if (validation.tooLong.length > 0) return invalid(m.placeholderTooLong());
	return { error: null, hasPlaceholders: validation.valid.length > 0 };
}

/** The message to show for a failed save. */
export function saveErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : m.genericError();
}
