import { z } from 'zod';

export const PreambleClauseSchema = z.object({
	id: z.string(),
	content: z.string() // Plain text, e.g., "Recalling the Universal Declaration of Human Rights"
});

export const OperativeClauseSchema = z.object({
	id: z.string(),
	content: z.string() // Plain text with inline sub-clauses
});

export const ResolutionSchema = z.object({
	committeeName: z.string(),
	preamble: z.array(PreambleClauseSchema),
	operative: z.array(OperativeClauseSchema)
});

export type PreambleClause = z.infer<typeof PreambleClauseSchema>;
export type OperativeClause = z.infer<typeof OperativeClauseSchema>;
export type Resolution = z.infer<typeof ResolutionSchema>;

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
