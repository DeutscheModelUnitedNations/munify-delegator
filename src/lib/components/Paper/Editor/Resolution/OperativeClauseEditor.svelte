<script lang="ts">
	import {
		type OperativeClause,
		type ClauseBlock,
		createTextBlock,
		createSubclausesBlock,
		createEmptySubClause
	} from '$lib/schemata/resolution';
	import type { PhrasePattern } from '$lib/services/phraseValidation';
	import SubClauseEditor from './SubClauseEditor.svelte';
	import PhraseSuggestions from './PhraseSuggestions.svelte';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		clause: OperativeClause;
		index: number;
		onUpdate: (clause: OperativeClause) => void;
		onMoveUp?: () => void;
		onMoveDown?: () => void;
		onDelete?: () => void;
		onFocus?: () => void;
		canMoveUp?: boolean;
		canMoveDown?: boolean;
		validationError?: string;
		patterns?: PhrasePattern[];
		// Called when a depth-1 subclause wants to outdent to become a new operative clause
		onOutdentToOperative?: (newOperative: OperativeClause) => void;
	}

	let {
		clause,
		index,
		onUpdate,
		onMoveUp,
		onMoveDown,
		onDelete,
		onFocus,
		canMoveUp = true,
		canMoveDown = true,
		validationError,
		patterns = [],
		onOutdentToOperative
	}: Props = $props();

	let showSuggestions = $state(false);
	let suggestionComponent: PhraseSuggestions | undefined = $state();

	// Get first text block content for suggestions
	let firstTextContent = $derived(() => {
		const firstBlock = clause.blocks[0];
		return firstBlock?.type === 'text' ? firstBlock.content : '';
	});

	// Update a specific block's content
	function updateBlockContent(blockIndex: number, content: string) {
		const block = clause.blocks[blockIndex];
		if (block.type === 'text') {
			const newBlocks = [...clause.blocks];
			newBlocks[blockIndex] = { ...block, content };
			onUpdate({ ...clause, blocks: newBlocks });
		}
	}

	// Update subclauses in a subclauses block
	function updateSubClauses(blockIndex: number, items: import('$lib/schemata/resolution').SubClause[]) {
		const block = clause.blocks[blockIndex];
		if (block.type === 'subclauses') {
			const newBlocks = [...clause.blocks];
			if (items.length > 0) {
				newBlocks[blockIndex] = { ...block, items };
			} else {
				// Remove empty subclauses block
				newBlocks.splice(blockIndex, 1);
			}
			onUpdate({ ...clause, blocks: newBlocks });
		}
	}

	// Add a subclauses block with initial subclause
	function addSubClausesBlock() {
		const newBlocks: ClauseBlock[] = [
			...clause.blocks,
			createSubclausesBlock([createEmptySubClause()])
		];
		onUpdate({ ...clause, blocks: newBlocks });
	}

	// Add a continuation text block after a specific block
	function addContinuationText(afterBlockIndex: number) {
		const newBlocks = [...clause.blocks];
		newBlocks.splice(afterBlockIndex + 1, 0, createTextBlock());
		onUpdate({ ...clause, blocks: newBlocks });
	}

	// Delete a block (can't delete first text block)
	function deleteBlock(blockIndex: number) {
		if (blockIndex === 0) return;
		const newBlocks = clause.blocks.filter((_, i) => i !== blockIndex);
		onUpdate({ ...clause, blocks: newBlocks });
	}

	// Check if clause has any subclauses blocks
	function hasSubclausesBlock(): boolean {
		return clause.blocks.some((b) => b.type === 'subclauses');
	}

	// Suggestion handling for first text block
	function handleInput(blockIndex: number, content: string) {
		updateBlockContent(blockIndex, content);
		if (blockIndex === 0) {
			showSuggestions = content.length > 0 && content.length < 30 && !content.includes(',');
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (suggestionComponent?.handleKeyDown(e)) {
			e.preventDefault();
		}
	}

	function handleFocus(blockIndex: number) {
		if (blockIndex === 0) {
			onFocus?.();
			const content = firstTextContent();
			if (patterns.length > 0 && content.length > 0 && content.length < 30) {
				showSuggestions = true;
			}
		}
	}

	function handleBlur() {
		setTimeout(() => {
			showSuggestions = false;
		}, 150);
	}

	function selectSuggestion(phrase: string) {
		const firstBlock = clause.blocks[0];
		if (firstBlock?.type === 'text') {
			const content = firstBlock.content;
			const commaIndex = content.indexOf(',');
			const newContent = commaIndex > -1 ? phrase + content.slice(commaIndex) : phrase;
			updateBlockContent(0, newContent);
		}
		showSuggestions = false;
	}
</script>

<div class="bg-base-100 rounded-lg p-3 border border-base-300">
	{#each clause.blocks as block, blockIndex (block.id)}
		{#if block.type === 'text'}
			<!-- Text block -->
			<div class="flex gap-2 items-start" class:mt-3={blockIndex > 0}>
				<!-- Label only for first text block -->
				{#if blockIndex === 0}
					<span class="text-sm font-medium text-base-content/70 min-w-8 pt-2">
						{index + 1}.
					</span>
				{:else}
					<span class="min-w-8"></span>
				{/if}

				<div class="relative flex-1">
					<textarea
						value={block.content}
						oninput={(e) => handleInput(blockIndex, e.currentTarget.value)}
						placeholder={blockIndex === 0
							? m.resolutionOperativePlaceholder()
							: m.resolutionContinuationPlaceholder()}
						class="textarea textarea-bordered w-full min-h-20 resize-y text-sm leading-relaxed"
						class:textarea-warning={blockIndex === 0 && validationError}
						rows="2"
						onkeydown={blockIndex === 0 ? handleKeyDown : undefined}
						onfocus={() => handleFocus(blockIndex)}
						onblur={blockIndex === 0 ? handleBlur : undefined}
					></textarea>

					{#if blockIndex === 0 && patterns.length > 0}
						<PhraseSuggestions
							bind:this={suggestionComponent}
							{patterns}
							inputValue={firstTextContent()}
							visible={showSuggestions}
							onSelect={selectSuggestion}
							onClose={() => (showSuggestions = false)}
						/>
					{/if}
				</div>
			</div>

			<!-- Block action row for continuation text blocks -->
			{#if blockIndex > 0}
				<div class="flex flex-wrap gap-1 ml-10 mt-1">
					<div class="flex-1"></div>
					<button
						type="button"
						class="btn btn-ghost btn-xs gap-1 text-error"
						onclick={() => deleteBlock(blockIndex)}
					>
						<i class="fa-solid fa-trash"></i>
						{m.resolutionDeleteBlock()}
					</button>
				</div>
			{/if}
		{:else if block.type === 'subclauses'}
			<!-- Subclauses block -->
			<div class="mt-3 pt-3 border-t border-base-200">
				<SubClauseEditor
					subClauses={block.items}
					depth={1}
					onUpdate={(items) => updateSubClauses(blockIndex, items)}
					{onOutdentToOperative}
				/>
				<!-- Add continuation text after subclauses -->
				<div class="mt-2 flex gap-1 ml-4">
					<button
						type="button"
						class="btn btn-ghost btn-xs gap-1 text-primary"
						onclick={() => addContinuationText(blockIndex)}
					>
						<i class="fa-solid fa-paragraph"></i>
						{m.resolutionAddContinuation()}
					</button>
				</div>
			</div>
		{/if}
	{/each}

	<!-- Main clause action buttons -->
	<div class="flex flex-wrap gap-1 {clause.blocks[0]?.type === 'text' ? 'ml-10' : ''} mt-2">
		{#if validationError}
			<span class="badge badge-warning badge-sm gap-1">
				<i class="fa-solid fa-triangle-exclamation"></i>
				{m.resolutionUnknownPhrase()}
			</span>
		{/if}

		<div class="flex-1"></div>

		<button
			type="button"
			class="btn btn-ghost btn-xs gap-1"
			onclick={onMoveUp}
			disabled={!canMoveUp}
		>
			<i class="fa-solid fa-chevron-up"></i>
			{m.resolutionMoveUp()}
		</button>
		<button
			type="button"
			class="btn btn-ghost btn-xs gap-1"
			onclick={onMoveDown}
			disabled={!canMoveDown}
		>
			<i class="fa-solid fa-chevron-down"></i>
			{m.resolutionMoveDown()}
		</button>
		{#if !hasSubclausesBlock()}
			<button
				type="button"
				class="btn btn-ghost btn-xs gap-1 text-primary"
				onclick={addSubClausesBlock}
			>
				<i class="fa-solid fa-indent"></i>
				{m.resolutionAddSubClause()}
			</button>
		{/if}
		<button type="button" class="btn btn-ghost btn-xs gap-1 text-error" onclick={onDelete}>
			<i class="fa-solid fa-trash"></i>
			{m.resolutionDeleteClause()}
		</button>
	</div>
</div>
