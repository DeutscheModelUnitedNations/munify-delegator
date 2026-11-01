import type { JSONContent } from '@tiptap/core';

/** Whether a TipTap document (or any node of one) contains any non-whitespace text. */
export function hasTextContent(node: JSONContent | null | undefined): boolean {
	if (!node) return false;
	if (node.type === 'text' && node.text?.trim()) return true;
	return node.content?.some(hasTextContent) ?? false;
}
