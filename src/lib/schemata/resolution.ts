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

// =============================================================================
// BLOCK MANIPULATION HELPERS
// =============================================================================

/**
 * Merge two consecutive text blocks into one.
 * The second text block's content is appended to the first with a space.
 * Returns new blocks array with merged result.
 */
export function mergeTextBlocks(blocks: ClauseBlock[], index1: number, index2: number): ClauseBlock[] {
	const block1 = blocks[index1];
	const block2 = blocks[index2];
	if (block1?.type !== 'text' || block2?.type !== 'text') {
		return blocks;
	}

	const mergedContent = [block1.content.trim(), block2.content.trim()]
		.filter((c) => c.length > 0)
		.join(' ');

	const newBlocks = [...blocks];
	newBlocks[index1] = { ...block1, content: mergedContent };
	newBlocks.splice(index2, 1);
	return newBlocks;
}

/**
 * Merge two consecutive subclauses blocks into one.
 * The second block's items are appended to the first.
 * Returns new blocks array with merged result.
 */
export function mergeSubclausesBlocks(blocks: ClauseBlock[], index1: number, index2: number): ClauseBlock[] {
	const block1 = blocks[index1];
	const block2 = blocks[index2];
	if (block1?.type !== 'subclauses' || block2?.type !== 'subclauses') {
		return blocks;
	}

	const newBlocks = [...blocks];
	newBlocks[index1] = {
		...block1,
		items: [...block1.items, ...block2.items]
	};
	newBlocks.splice(index2, 1);
	return newBlocks;
}

/**
 * Clean up blocks array by:
 * 1. Removing empty subclauses blocks
 * 2. Merging consecutive text blocks
 * 3. Merging consecutive subclauses blocks
 * Returns new blocks array.
 */
export function cleanupBlocks(blocks: ClauseBlock[]): ClauseBlock[] {
	// First pass: remove empty subclauses blocks
	let result = blocks.filter((block) => {
		if (block.type === 'subclauses' && block.items.length === 0) {
			return false;
		}
		return true;
	});

	// Second pass: merge consecutive same-type blocks
	let i = 0;
	while (i < result.length - 1) {
		const current = result[i];
		const next = result[i + 1];

		if (current.type === 'text' && next.type === 'text') {
			result = mergeTextBlocks(result, i, i + 1);
			// Don't increment i, check same position again
		} else if (current.type === 'subclauses' && next.type === 'subclauses') {
			result = mergeSubclausesBlocks(result, i, i + 1);
			// Don't increment i, check same position again
		} else {
			i++;
		}
	}

	return result;
}

/**
 * Convert a SubClause to an OperativeClause.
 * Used when outdenting from depth 1 to top level.
 */
export function subClauseToOperativeClause(subClause: SubClause): OperativeClause {
	return {
		id: generateClauseId('o'),
		blocks: [...subClause.blocks]
	};
}

/**
 * Find the last subclauses block in a blocks array, if any.
 * Returns the index or -1 if not found.
 */
export function findLastSubclausesBlockIndex(blocks: ClauseBlock[]): number {
	for (let i = blocks.length - 1; i >= 0; i--) {
		if (blocks[i].type === 'subclauses') {
			return i;
		}
	}
	return -1;
}

/**
 * Add a subclause to the end of a SubClause's nested structure.
 * If the SubClause already has a subclauses block at the end, adds to that.
 * Otherwise, creates a new subclauses block.
 */
export function appendNestedSubClause(parent: SubClause, child: SubClause): SubClause {
	const lastBlockIndex = parent.blocks.length - 1;
	const lastBlock = parent.blocks[lastBlockIndex];

	if (lastBlock?.type === 'subclauses') {
		// Add to existing subclauses block
		const newBlocks = [...parent.blocks];
		newBlocks[lastBlockIndex] = {
			...lastBlock,
			items: [...lastBlock.items, child]
		};
		return { ...parent, blocks: newBlocks };
	} else {
		// Create new subclauses block
		return {
			...parent,
			blocks: [...parent.blocks, createSubclausesBlock([child])]
		};
	}
}
