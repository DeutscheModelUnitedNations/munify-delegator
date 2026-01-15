/**
 * Resolution Parser Service
 *
 * Parses plain text into structured Resolution clauses (preamble and operative).
 * Supports flexible pattern detection for sub-clauses.
 */

export interface ParsedSubClause {
	content: string;
	children?: ParsedSubClause[];
}

export interface ParsedOperativeClause {
	content: string;
	subClauses?: ParsedSubClause[];
}

type PatternType = 'number' | 'letter' | 'roman' | 'bullet';

interface DetectedPattern {
	type: PatternType;
	marker: string;
}

/**
 * Detect what kind of list marker a line starts with
 */
function detectPattern(line: string): DetectedPattern | null {
	const trimmed = line.trim();

	// Order matters - check more specific patterns first
	const patterns: Array<{ regex: RegExp; type: PatternType }> = [
		// Roman numerals (check before letters to avoid confusion with 'i', 'v', etc.)
		{ regex: /^([IVXLCDM]+)[.\):\s]/i, type: 'roman' },
		// Numbers with various separators
		{ regex: /^(\d+)[.\):\s]/, type: 'number' },
		{ regex: /^\((\d+)\)/, type: 'number' },
		// Letters (single or repeated like aa, aaa)
		{ regex: /^([a-z]+)[.\):\s]/i, type: 'letter' },
		{ regex: /^\(([a-z]+)\)/i, type: 'letter' },
		// Bullets
		{ regex: /^[-•*]\s*/, type: 'bullet' }
	];

	for (const p of patterns) {
		const match = trimmed.match(p.regex);
		if (match) {
			return { type: p.type, marker: match[0] };
		}
	}

	return null;
}

/**
 * Check if a pattern is a Roman numeral (to distinguish from letters)
 */
function isRomanNumeral(str: string): boolean {
	return /^[IVXLCDM]+$/i.test(str);
}

/**
 * Parse preamble text into individual clause strings
 *
 * Strategy: Split by commas at end of lines/paragraphs
 */
export function parsePreambleText(text: string): string[] {
	if (!text.trim()) return [];

	// Split by comma + newline, or just by newlines if no commas
	const hasCommaNewlines = /,\s*\n/.test(text);

	let clauses: string[];

	if (hasCommaNewlines) {
		// Split by comma followed by newline
		clauses = text.split(/,\s*\n/);
	} else {
		// Fall back to splitting by newlines
		clauses = text.split(/\n/);
	}

	return clauses
		.map((s) => s.trim())
		.map((s) => s.replace(/,$/, '').trim()) // Remove trailing comma
		.map((s) => s.replace(/;$/, '').trim()) // Remove trailing semicolon
		.filter((s) => s.length > 0);
}

/**
 * Parse operative text into structured clauses with sub-clauses
 *
 * Uses flexible pattern detection - when pattern type changes,
 * it indicates a new depth level.
 */
export function parseOperativeText(text: string): ParsedOperativeClause[] {
	if (!text.trim()) return [];

	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	if (lines.length === 0) return [];

	const clauses: ParsedOperativeClause[] = [];

	// Track the pattern type at each depth level
	const patternStack: PatternType[] = [];
	let currentDepth = -1;

	// Stack to build the clause hierarchy
	interface StackItem {
		depth: number;
		clause: ParsedOperativeClause | ParsedSubClause;
	}
	const stack: StackItem[] = [];

	for (const line of lines) {
		const detected = detectPattern(line);

		if (detected) {
			// Determine the depth based on pattern type
			let newDepth = patternStack.indexOf(detected.type);

			if (newDepth === -1) {
				// New pattern type - add to stack (new depth)
				patternStack.push(detected.type);
				newDepth = patternStack.length - 1;
			}

			// Strip the marker from the content
			const content = line.replace(detected.marker, '').trim();
			// Also remove trailing punctuation
			const cleanContent = content.replace(/[;.,]$/, '').trim();

			if (newDepth === 0) {
				// Top-level operative clause
				const newClause: ParsedOperativeClause = { content: cleanContent };
				clauses.push(newClause);
				stack.length = 0; // Clear stack
				stack.push({ depth: 0, clause: newClause });
				currentDepth = 0;
			} else {
				// Sub-clause - find parent
				const newSubClause: ParsedSubClause = { content: cleanContent };

				// Pop stack until we find a parent at lower depth
				while (stack.length > 0 && stack[stack.length - 1].depth >= newDepth) {
					stack.pop();
				}

				if (stack.length > 0) {
					const parent = stack[stack.length - 1].clause;

					if (newDepth === 1) {
						// Direct child of operative clause
						const opClause = parent as ParsedOperativeClause;
						if (!opClause.subClauses) opClause.subClauses = [];
						opClause.subClauses.push(newSubClause);
					} else {
						// Nested sub-clause
						const parentSub = parent as ParsedSubClause;
						if (!parentSub.children) parentSub.children = [];
						parentSub.children.push(newSubClause);
					}
				}

				stack.push({ depth: newDepth, clause: newSubClause });
				currentDepth = newDepth;
			}
		} else {
			// Line without a recognized pattern - append to previous clause content
			if (stack.length > 0) {
				const current = stack[stack.length - 1].clause;
				current.content += ' ' + line.replace(/[;.,]$/, '').trim();
			} else if (clauses.length === 0) {
				// First line without pattern - treat as first clause
				const newClause: ParsedOperativeClause = {
					content: line.replace(/[;.,]$/, '').trim()
				};
				clauses.push(newClause);
				stack.push({ depth: 0, clause: newClause });
			}
		}
	}

	return clauses;
}

/**
 * Count total clauses including sub-clauses for display
 */
export function countOperativeClauses(clauses: ParsedOperativeClause[]): {
	main: number;
	sub: number;
} {
	let sub = 0;

	function countSub(subClauses: ParsedSubClause[] | undefined): void {
		if (!subClauses) return;
		sub += subClauses.length;
		for (const s of subClauses) {
			countSub(s.children);
		}
	}

	for (const clause of clauses) {
		countSub(clause.subClauses);
	}

	return { main: clauses.length, sub };
}
