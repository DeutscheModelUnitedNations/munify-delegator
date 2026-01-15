/**
 * Phrase validation service for Resolution Editor
 *
 * Parses phrase pattern files and validates clause content against them.
 *
 * Pattern syntax:
 * - `()` - Optional word/phrase
 * - `_` - Optional placeholder (zero or more words)
 */

export interface PhrasePattern {
	raw: string; // Original pattern from file
	regex: RegExp; // Compiled regex for matching
}

export interface ValidationResult {
	valid: boolean;
	matchedPhrase?: string; // The matched phrase text (for italicization)
	italicEnd?: number; // Character index where italic portion ends
}

// Cache for loaded patterns
const patternCache: Map<string, PhrasePattern[]> = new Map();

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a single phrase pattern into a regex
 *
 * Examples:
 * - "bedauernd" → /^(bedauernd)/i
 * - "(zutiefst) bedauernd" → /^((?:zutiefst\s+)?bedauernd)/i
 * - "ist sich _ bewusst" → /^(ist\s+sich(?:\s+\S+)*\s+bewusst)/i
 *   Matches: "ist sich bewusst", "ist sich der Tatsache bewusst"
 */
function parsePatternToRegex(pattern: string): RegExp {
	let regexStr = '';
	let i = 0;

	while (i < pattern.length) {
		// Handle optional group: (word)
		if (pattern[i] === '(') {
			const closeIndex = pattern.indexOf(')', i);
			if (closeIndex === -1) {
				// Malformed pattern, treat as literal
				regexStr += escapeRegex(pattern[i]);
				i++;
				continue;
			}

			const content = pattern.slice(i + 1, closeIndex).trim();
			// Optional word/phrase
			regexStr += '(?:' + escapeRegex(content) + '\\s+)?';

			i = closeIndex + 1;
			// Skip trailing space after optional group
			if (pattern[i] === ' ') i++;
		}
		// Handle optional placeholder: _
		else if (pattern[i] === '_') {
			// Optional placeholder - zero or more words
			// The preceding space was skipped, so this handles: optional (space + words)
			regexStr += '(?:\\s+\\S+)*';
			i++;
			// DON'T skip trailing space - let it add \s+ for the word that follows
		}
		// Handle space
		else if (pattern[i] === ' ') {
			// If next char is _, don't add \s+ here - let _ handle it
			if (pattern[i + 1] === '_') {
				i++;
			} else {
				regexStr += '\\s+';
				i++;
			}
		}
		// Handle regular characters
		else {
			// Collect consecutive regular characters
			let word = '';
			while (i < pattern.length && pattern[i] !== ' ' && pattern[i] !== '(' && pattern[i] !== '_') {
				word += pattern[i];
				i++;
			}
			regexStr += escapeRegex(word);
		}
	}

	// Wrap in capture group and anchor to start
	return new RegExp('^(' + regexStr + ')', 'i');
}

/**
 * Parse phrase file content into patterns
 */
export function parsePhrasePatterns(content: string): PhrasePattern[] {
	const lines = content.split('\n');
	const patterns: PhrasePattern[] = [];

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines and comments
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		try {
			const regex = parsePatternToRegex(trimmed);
			patterns.push({
				raw: trimmed,
				regex
			});
		} catch (e) {
			console.warn(`Failed to parse phrase pattern: ${trimmed}`, e);
		}
	}

	return patterns;
}

/**
 * Validate text against a list of phrase patterns
 */
export function validatePhrase(text: string, patterns: PhrasePattern[]): ValidationResult {
	const trimmedText = text.trim();

	if (!trimmedText) {
		return { valid: false };
	}

	for (const pattern of patterns) {
		const match = trimmedText.match(pattern.regex);
		if (match) {
			return {
				valid: true,
				matchedPhrase: match[1],
				italicEnd: match[1].length
			};
		}
	}

	return { valid: false };
}

/**
 * Load phrase patterns from static files
 */
export async function loadPhrasePatterns(type: 'preamble' | 'operative'): Promise<PhrasePattern[]> {
	const cacheKey = type;

	// Return cached patterns if available
	if (patternCache.has(cacheKey)) {
		return patternCache.get(cacheKey)!;
	}

	try {
		const response = await fetch(`/resolution-phrases/${type}.txt`);
		if (!response.ok) {
			console.error(`Failed to load phrase patterns for ${type}: ${response.status}`);
			return [];
		}

		const content = await response.text();
		const patterns = parsePhrasePatterns(content);

		// Cache the patterns
		patternCache.set(cacheKey, patterns);

		return patterns;
	} catch (e) {
		console.error(`Error loading phrase patterns for ${type}:`, e);
		return [];
	}
}

/**
 * Clear the pattern cache (useful for testing or hot-reloading)
 */
export function clearPatternCache(): void {
	patternCache.clear();
}
