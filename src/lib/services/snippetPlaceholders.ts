import type { JSONContent } from '@tiptap/core';

/**
 * Regex for matching valid placeholders.
 * Supports: Unicode letters, numbers, spaces, hyphens, underscores, and common punctuation.
 * Examples: {{name}}, {{Ländercode}}, {{Dies ist eine Nachricht!}}
 */
const PLACEHOLDER_REGEX = /\{\{([\p{L}\p{N}\s\-_,.!?]+)\}\}/gu;

/**
 * Regex for detecting potentially malformed placeholders (unclosed braces).
 * Matches {{ followed by content but not properly closed with }}
 */
const MALFORMED_REGEX = /\{\{(?:[^{}]*(?:\{(?!\{)[^{}]*)*)?(?:$|\}(?!\}))/g;

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

/**
 * Extracts placeholder names from TipTap JSON content.
 * Placeholders follow the pattern: {{placeholderName}}
 * Supports Unicode letters, numbers, spaces, hyphens, underscores, and punctuation.
 */
export function extractPlaceholders(content: JSONContent): string[] {
	const placeholders = new Set<string>();

	function traverse(node: JSONContent) {
		if (!node) return;

		if (node.type === 'text' && node.text) {
			let match;
			// Reset lastIndex before starting
			PLACEHOLDER_REGEX.lastIndex = 0;
			while ((match = PLACEHOLDER_REGEX.exec(node.text)) !== null) {
				const placeholder = match[1].trim();
				if (placeholder.length > 0) {
					placeholders.add(placeholder);
				}
			}
		}

		if (node.content && Array.isArray(node.content)) {
			node.content.forEach(traverse);
		}
	}

	traverse(content);
	return Array.from(placeholders);
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

	function traverse(node: JSONContent) {
		if (!node) return;

		if (node.type === 'text' && node.text) {
			// Check for empty placeholders "{{}}" which PLACEHOLDER_REGEX doesn't match
			if (node.text.includes('{{}}')) {
				result.empty.push('{{}}');
			}

			// Find all valid placeholders
			PLACEHOLDER_REGEX.lastIndex = 0;
			let match;
			while ((match = PLACEHOLDER_REGEX.exec(node.text)) !== null) {
				const placeholder = match[1];
				const trimmed = placeholder.trim();

				if (trimmed.length === 0) {
					result.empty.push(match[0]);
				} else if (trimmed.length > MAX_PLACEHOLDER_LENGTH) {
					result.tooLong.push(trimmed);
				} else {
					validSet.add(trimmed);
				}
			}

			// Then, check for malformed patterns
			// Look for {{ that aren't part of valid placeholders
			const text = node.text;
			let searchPos = 0;
			while (searchPos < text.length) {
				const openIdx = text.indexOf('{{', searchPos);
				if (openIdx === -1) break;

				// Check if this is a valid placeholder by looking for }}
				const closeIdx = text.indexOf('}}', openIdx + 2);
				if (closeIdx === -1) {
					// No closing braces found - malformed
					const remaining = text.substring(openIdx);
					malformedSet.add(
						remaining.substring(0, Math.min(30, remaining.length)) +
							(remaining.length > 30 ? '...' : '')
					);
					break;
				}

				// Check if there's another {{ before the }}
				const innerOpenIdx = text.indexOf('{{', openIdx + 2);
				if (innerOpenIdx !== -1 && innerOpenIdx < closeIdx) {
					// Nested {{ found - malformed
					const malformedPart = text.substring(openIdx, closeIdx + 2);
					malformedSet.add(
						malformedPart.substring(0, Math.min(30, malformedPart.length)) +
							(malformedPart.length > 30 ? '...' : '')
					);
				}

				searchPos = closeIdx + 2;
			}
		}

		if (node.content && Array.isArray(node.content)) {
			node.content.forEach(traverse);
		}
	}

	traverse(content);
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

/**
 * Checks if a TipTap JSON content contains any placeholders.
 */
export function hasPlaceholders(content: JSONContent): boolean {
	return extractPlaceholders(content).length > 0;
}
