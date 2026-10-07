import type { JSONContent } from '@tiptap/core';

/**
 * Regex for matching valid placeholders.
 * Supports: Unicode letters, numbers, spaces, hyphens, underscores, and common punctuation.
 * Examples: {{name}}, {{Ländercode}}, {{Dies ist eine Nachricht!}}
 */
const PLACEHOLDER_REGEX = /\{\{([\p{L}\p{N}\s\-_,.!?]+)\}\}/gu;

/**
 * Maximum allowed length for a placeholder name.
 */
const MAX_PLACEHOLDER_LENGTH = 50;

export interface PlaceholderValidation {
	/** Properly formatted placeholders */
	valid: string[];
	/** Patterns that look like placeholders but are malformed */
	malformed: string[];
	/** Placeholders that exceed the maximum length */
	tooLong: string[];
	/** Empty or whitespace-only placeholders */
	empty: string[];
}

/** Calls `visit` with the text of every text node in the document, depth first. */
function forEachText(node: JSONContent, visit: (text: string) => void) {
	if (!node) return;
	if (node.type === 'text' && node.text) visit(node.text);
	if (node.content && Array.isArray(node.content)) {
		for (const child of node.content) forEachText(child, visit);
	}
}

/** Every `{{…}}` match in `text`; group 1 is the untrimmed name. */
function placeholderMatches(text: string): RegExpExecArray[] {
	// Reset lastIndex before starting
	PLACEHOLDER_REGEX.lastIndex = 0;
	const matches: RegExpExecArray[] = [];
	let match;
	while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) matches.push(match);
	return matches;
}

/**
 * Extracts placeholder names from TipTap JSON content.
 * Placeholders follow the pattern: {{placeholderName}}
 * Supports Unicode letters, numbers, spaces, hyphens, underscores, and punctuation.
 */
export function extractPlaceholders(content: JSONContent): string[] {
	const placeholders = new Set<string>();

	forEachText(content, (text) => {
		for (const match of placeholderMatches(text)) {
			const placeholder = match[1].trim();
			if (placeholder.length > 0) {
				placeholders.add(placeholder);
			}
		}
	});

	return Array.from(placeholders);
}

/** Shortens a malformed fragment for display. */
function truncateFragment(fragment: string): string {
	return fragment.substring(0, Math.min(30, fragment.length)) + (fragment.length > 30 ? '...' : '');
}

/**
 * The `{{` in `text` that do not open a proper placeholder: those never closed, and those with
 * another `{{` before their `}}`.
 */
function malformedFragments(text: string): string[] {
	const fragments: string[] = [];
	let searchPos = 0;
	while (searchPos < text.length) {
		const openIdx = text.indexOf('{{', searchPos);
		if (openIdx === -1) break;

		// Check if this is a valid placeholder by looking for }}
		const closeIdx = text.indexOf('}}', openIdx + 2);
		if (closeIdx === -1) {
			// No closing braces found - malformed
			fragments.push(truncateFragment(text.substring(openIdx)));
			break;
		}

		// Check if there's another {{ before the }}
		const innerOpenIdx = text.indexOf('{{', openIdx + 2);
		if (innerOpenIdx !== -1 && innerOpenIdx < closeIdx) {
			// Nested {{ found - malformed
			fragments.push(truncateFragment(text.substring(openIdx, closeIdx + 2)));
		}

		searchPos = closeIdx + 2;
	}
	return fragments;
}

/**
 * Validates placeholders in TipTap JSON content.
 * Returns information about valid placeholders and any issues found.
 */
export function validatePlaceholders(content: JSONContent): PlaceholderValidation {
	const result: PlaceholderValidation = {
		valid: [],
		malformed: [],
		tooLong: [],
		empty: []
	};

	const validSet = new Set<string>();
	const malformedSet = new Set<string>();

	forEachText(content, (text) => {
		// Check for empty placeholders "{{}}" which PLACEHOLDER_REGEX doesn't match
		if (text.includes('{{}}')) {
			result.empty.push('{{}}');
		}

		// Find all valid placeholders
		for (const match of placeholderMatches(text)) {
			const trimmed = match[1].trim();

			if (trimmed.length === 0) {
				result.empty.push(match[0]);
			} else if (trimmed.length > MAX_PLACEHOLDER_LENGTH) {
				result.tooLong.push(trimmed);
			} else {
				validSet.add(trimmed);
			}
		}

		// Then, check for malformed patterns
		for (const fragment of malformedFragments(text)) malformedSet.add(fragment);
	});

	result.valid = Array.from(validSet);
	result.malformed = Array.from(malformedSet);

	return result;
}

/**
 * Replaces placeholders in TipTap JSON content with provided values.
 * Returns a deep copy of the content with placeholders replaced.
 * Empty text nodes are removed as TipTap doesn't allow them.
 */
export function replacePlaceholders(
	content: JSONContent,
	values: Record<string, string>
): JSONContent {
	if (!content) return content;

	// Deep clone to avoid mutating the original
	const cloned: JSONContent = JSON.parse(JSON.stringify(content));

	function traverse(node: JSONContent) {
		if (!node) return;

		if (node.type === 'text' && node.text) {
			for (const [key, value] of Object.entries(values)) {
				// Escape special regex characters in the key
				const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				node.text = node.text.replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'gu'), value);
			}
		}

		if (node.content && Array.isArray(node.content)) {
			node.content.forEach(traverse);
			// Remove empty text nodes (TipTap doesn't allow them)
			node.content = node.content.filter((child) => !(child.type === 'text' && child.text === ''));
		}
	}

	traverse(cloned);
	return cloned;
}
