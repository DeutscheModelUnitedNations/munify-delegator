import type { JSONContent } from '@tiptap/core';

/**
 * Validates that content is a valid TipTap JSON structure.
 * A valid TipTap document must have a `type` property.
 * An empty/invalid content will cause TipTap to crash with:
 * "TypeError: undefined is not an object (evaluating 'e(o).type')"
 */
export function isValidTipTapContent(content: unknown): content is JSONContent {
	if (!content || typeof content !== 'object') {
		return false;
	}

	// TipTap content must have a 'type' property
	if (!('type' in content) || typeof (content as JSONContent).type !== 'string') {
		return false;
	}

	return true;
}

/**
 * Returns valid TipTap content or undefined if the content is invalid.
 * Use this when passing content to TipTap editor to prevent crashes.
 */
export function getSafeTipTapContent(content: unknown): JSONContent | undefined {
	if (isValidTipTapContent(content)) {
		return content;
	}
	return undefined;
}

/**
 * Returns an empty but valid TipTap document structure.
 */
export function getEmptyTipTapDocument(): JSONContent {
	return {
		type: 'doc',
		content: []
	};
}
