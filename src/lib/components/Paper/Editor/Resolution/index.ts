// Main exports - using the library wrapper
export { default as ResolutionEditor } from './ResolutionEditorWrapper.svelte';

// Re-export types and utilities from the library
export {
	// Components
	ResolutionPreview,
	// Types
	type Resolution,
	type ResolutionHeaderData,
	type OperativeClause,
	type PreambleClause,
	type SubClause,
	type ClauseBlock,
	type TextBlock,
	type SubclausesBlock,
	// Validation and migration
	validateResolution,
	migrateResolution,
	// Factory functions
	createEmptyResolution,
	createEmptyOperativeClause,
	createEmptyPreambleClause,
	createEmptySubClause,
	createTextBlock,
	createSubclausesBlock,
	// Label generation
	getSubClauseLabel,
	toRoman,
	toLetter,
	toLowerRoman,
	MAX_SUBCLAUSE_DEPTH,
	// Utilities
	isClauseEmpty,
	getFirstTextContent,
	hasSubclauses,
	getAllTextContent,
	// Block manipulation
	mergeTextBlocks,
	mergeSubclausesBlocks,
	cleanupBlocks,
	subClauseToOperativeClause,
	findLastSubclausesBlockIndex,
	appendNestedSubClause
} from '@deutschemodelunitednations/munify-resolution-editor';
