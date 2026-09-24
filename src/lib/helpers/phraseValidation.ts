/**
 * Phrase validation service for Resolution Editor
 *
 * Parses phrase pattern files and validates clause content against them.
 * Each phrase is matched as a case-insensitive prefix of the clause content.
 */

export interface PhrasePattern {
	phrase: string; // The phrase text (e.g., "zutiefst bedauernd")
	regex: RegExp; // Simple regex: /^phrase/i (case-insensitive start match)
}

export interface ValidationResult {
	valid: boolean;
	matchedPhrase?: string; // The matched phrase text (for italicization)
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
 * Parse phrase file content into patterns
 */
export function parsePhrasePatterns(content: string): PhrasePattern[] {
	return content
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line && !line.startsWith('#'))
		.map((phrase) => ({
			phrase,
			regex: new RegExp(`^(${escapeRegex(phrase)})`, 'i')
		}));
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
				matchedPhrase: match[1]
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
