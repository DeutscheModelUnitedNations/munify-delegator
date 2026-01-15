import { z } from 'zod';

// SubClause type definition (for recursive schema)
export type SubClause = {
	id: string;
	content: string;
	children?: SubClause[];
};

// Recursive sub-clause schema (up to 4 nesting levels)
export const SubClauseSchema: z.ZodType<SubClause> = z.lazy(() =>
	z.object({
		id: z.string(),
		content: z.string(),
		children: z.array(SubClauseSchema).optional()
	})
);

export const PreambleClauseSchema = z.object({
	id: z.string(),
	content: z.string() // Plain text, e.g., "Recalling the Universal Declaration of Human Rights"
});

export const OperativeClauseSchema = z.object({
	id: z.string(),
	content: z.string(),
	subClauses: z.array(SubClauseSchema).optional()
});

export const ResolutionSchema = z.object({
	committeeName: z.string(),
	preamble: z.array(PreambleClauseSchema),
	operative: z.array(OperativeClauseSchema)
});

export type PreambleClause = z.infer<typeof PreambleClauseSchema>;
export type OperativeClause = z.infer<typeof OperativeClauseSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;

// Header metadata for UN-style resolution preview
export interface ResolutionHeaderData {
	conferenceName?: string;
	committeeAbbreviation?: string;
	committeeFullName?: string;
	documentNumber?: string;
	topic?: string;
	authoringDelegation?: string;
}

// Helper to create a new empty resolution
export function createEmptyResolution(committeeName: string): Resolution {
	return {
		committeeName,
		preamble: [],
		operative: []
	};
}

// Helper to generate unique IDs for clauses
export function generateClauseId(prefix: 'p' | 'o'): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to generate unique IDs for sub-clauses
export function generateSubClauseId(): string {
	return `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Convert number to Roman numerals (1 → I, 2 → II, etc.)
export function toRoman(num: number): string {
	const romanNumerals: [number, string][] = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I']
	];

	let result = '';
	let remaining = num;

	for (const [value, symbol] of romanNumerals) {
		while (remaining >= value) {
			result += symbol;
			remaining -= value;
		}
	}

	return result;
}

// Convert number to lowercase letter (1 → a, 2 → b, etc.)
export function toLetter(num: number): string {
	return String.fromCharCode(96 + num); // 97 is 'a'
}

// Generate sub-clause label based on depth and index
// Depth 1: I. II. III. (Roman numerals)
// Depth 2: a) b) c)
// Depth 3: aa) bb) cc)
// Depth 4: aaa) bbb) ccc)
export function getSubClauseLabel(index: number, depth: number): string {
	const num = index + 1;
	switch (depth) {
		case 1:
			return `${toRoman(num)}.`;
		case 2:
			return `${toLetter(num)})`;
		case 3:
			return `${toLetter(num).repeat(2)})`;
		case 4:
			return `${toLetter(num).repeat(3)})`;
		default:
			return `${num}.`;
	}
}

// Maximum allowed sub-clause nesting depth
export const MAX_SUBCLAUSE_DEPTH = 4;
