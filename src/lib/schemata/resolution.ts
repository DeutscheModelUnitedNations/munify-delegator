import { z } from 'zod';

// =============================================================================
// BLOCK-BASED SCHEMA (New Structure)
// =============================================================================

// ClauseBlock: Either a text block or a subclauses array
export type TextBlock = {
	type: 'text';
	id: string;
	content: string;
};

export type SubclausesBlock = {
	type: 'subclauses';
	id: string;
	items: SubClause[];
};

export type ClauseBlock = TextBlock | SubclausesBlock;

// SubClause: Recursive wrapper containing blocks
// RULE: First block MUST always be a text block
export type SubClause = {
	id: string;
	blocks: ClauseBlock[];
};

// OperativeClause: Top-level clause containing blocks
// RULE: First block MUST always be a text block
export type OperativeClause = {
	id: string;
	blocks: ClauseBlock[];
};

// Preamble stays unchanged
export type PreambleClause = {
	id: string;
	content: string;
};

export type Resolution = {
	committeeName: string;
	preamble: PreambleClause[];
	operative: OperativeClause[];
};

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

export const TextBlockSchema = z.object({
	type: z.literal('text'),
	id: z.string(),
	content: z.string()
});

// Forward declaration for recursive schema
export const SubClauseSchema: z.ZodType<SubClause> = z.lazy(() =>
	z.object({
		id: z.string(),
		blocks: z.array(ClauseBlockSchema)
	})
);

export const SubclausesBlockSchema = z.object({
	type: z.literal('subclauses'),
	id: z.string(),
	items: z.array(SubClauseSchema)
});

export const ClauseBlockSchema: z.ZodType<ClauseBlock> = z.lazy(() =>
	z.discriminatedUnion('type', [TextBlockSchema, SubclausesBlockSchema])
);

export const PreambleClauseSchema = z.object({
	id: z.string(),
	content: z.string()
});

export const OperativeClauseSchema = z.object({
	id: z.string(),
	blocks: z.array(ClauseBlockSchema)
});

export const ResolutionSchema = z.object({
	committeeName: z.string(),
	preamble: z.array(PreambleClauseSchema),
	operative: z.array(OperativeClauseSchema)
});

// =============================================================================
// LEGACY TYPES (for migration from old format)
// =============================================================================

export type LegacySubClause = {
	id: string;
	content: string;
	children?: LegacySubClause[];
};

export type LegacyOperativeClause = {
	id: string;
	content: string;
	subClauses?: LegacySubClause[];
};

export type LegacyResolution = {
	committeeName: string;
	preamble: PreambleClause[];
	operative: LegacyOperativeClause[];
};

// =============================================================================
// HEADER METADATA
// =============================================================================

export interface ResolutionHeaderData {
	conferenceName?: string;
	committeeAbbreviation?: string;
	committeeFullName?: string;
	documentNumber?: string;
	topic?: string;
	authoringDelegation?: string;
}

// =============================================================================
// ID GENERATORS
// =============================================================================

export function generateClauseId(prefix: 'p' | 'o'): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSubClauseId(): string {
	return `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateBlockId(): string {
	return `b-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createTextBlock(content: string = ''): TextBlock {
	return { type: 'text', id: generateBlockId(), content };
}

export function createSubclausesBlock(items: SubClause[] = []): SubclausesBlock {
	return { type: 'subclauses', id: generateBlockId(), items };
}

export function createEmptySubClause(): SubClause {
	return {
		id: generateSubClauseId(),
		blocks: [createTextBlock()]
	};
}

export function createEmptyOperativeClause(): OperativeClause {
	return {
		id: generateClauseId('o'),
		blocks: [createTextBlock()]
	};
}

export function createEmptyPreambleClause(): PreambleClause {
	return {
		id: generateClauseId('p'),
		content: ''
	};
}

export function createEmptyResolution(committeeName: string): Resolution {
	return {
		committeeName,
		preamble: [],
		operative: []
	};
}

// =============================================================================
// LABEL GENERATION
// =============================================================================

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

// =============================================================================
// MIGRATION FUNCTIONS
// =============================================================================

// Check if resolution is in legacy format
export function isLegacyResolution(data: unknown): data is LegacyResolution {
	if (!data || typeof data !== 'object') return false;
	const obj = data as Record<string, unknown>;
	if (!Array.isArray(obj.operative) || obj.operative.length === 0) return false;
	// Check first operative clause - if it has 'content' instead of 'blocks', it's legacy
	const firstOp = obj.operative[0] as Record<string, unknown>;
	return typeof firstOp.content === 'string' && !Array.isArray(firstOp.blocks);
}

// Migrate legacy sub-clause to new format
function migrateLegacySubClause(legacy: LegacySubClause): SubClause {
	const blocks: ClauseBlock[] = [createTextBlock(legacy.content)];

	if (legacy.children && legacy.children.length > 0) {
		blocks.push(createSubclausesBlock(legacy.children.map(migrateLegacySubClause)));
	}

	return {
		id: legacy.id,
		blocks
	};
}

// Migrate legacy operative clause to new format
function migrateLegacyOperativeClause(legacy: LegacyOperativeClause): OperativeClause {
	const blocks: ClauseBlock[] = [createTextBlock(legacy.content)];

	if (legacy.subClauses && legacy.subClauses.length > 0) {
		blocks.push(createSubclausesBlock(legacy.subClauses.map(migrateLegacySubClause)));
	}

	return {
		id: legacy.id,
		blocks
	};
}

// Migrate entire legacy resolution to new format
export function migrateResolution(data: unknown): Resolution {
	if (isLegacyResolution(data)) {
		return {
			committeeName: data.committeeName,
			preamble: data.preamble,
			operative: data.operative.map(migrateLegacyOperativeClause)
		};
	}
	// Already in new format or empty
	return data as Resolution;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Get the first text block content from a clause (for display purposes)
export function getFirstTextContent(clause: OperativeClause | SubClause): string {
	const firstBlock = clause.blocks[0];
	if (firstBlock && firstBlock.type === 'text') {
		return firstBlock.content;
	}
	return '';
}

// Check if a clause has any subclauses
export function hasSubclauses(clause: OperativeClause | SubClause): boolean {
	return clause.blocks.some((block) => block.type === 'subclauses');
}

// Get all text content from a clause (concatenated)
export function getAllTextContent(clause: OperativeClause | SubClause): string {
	return clause.blocks
		.filter((block): block is TextBlock => block.type === 'text')
		.map((block) => block.content)
		.join(' ');
}

// Check if clause is empty (all text blocks are empty and no subclauses)
export function isClauseEmpty(clause: OperativeClause | SubClause): boolean {
	for (const block of clause.blocks) {
		if (block.type === 'text' && block.content.trim()) {
			return false;
		}
		if (block.type === 'subclauses' && block.items.length > 0) {
			// Check if any subclause is non-empty
			if (block.items.some((sub) => !isClauseEmpty(sub))) {
				return false;
			}
		}
	}
	return true;
}
