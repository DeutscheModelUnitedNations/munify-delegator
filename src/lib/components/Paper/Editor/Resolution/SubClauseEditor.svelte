<script lang="ts">
	import {
		type SubClause,
		type ClauseBlock,
		type OperativeClause,
		createEmptySubClause,
		createTextBlock,
		createSubclausesBlock,
		getSubClauseLabel,
		MAX_SUBCLAUSE_DEPTH,
		cleanupBlocks,
		appendNestedSubClause,
		subClauseToOperativeClause
	} from '$lib/schemata/resolution';
	import { m } from '$lib/paraglide/messages';
	import Self from './SubClauseEditor.svelte';

	interface Props {
		subClauses: SubClause[];
		depth: number;
		onUpdate: (subClauses: SubClause[]) => void;
		// Called when a depth-1 subclause wants to outdent to become an operative clause
		onOutdentToOperative?: (newOperative: OperativeClause, afterIndex: number) => void;
		// Parent subclause index for outdent communication (used at depth > 1)
		parentSubClauseIndex?: number;
		// Called when a nested subclause wants to outdent to parent level
		onOutdentToParent?: (subClause: SubClause, afterParentIndex: number) => void;
	}

	let {
		subClauses,
		depth,
		onUpdate,
		onOutdentToOperative,
		parentSubClauseIndex,
		onOutdentToParent
	}: Props = $props();

	// =========================================================================
	// MOVE UP / DOWN - Only for SubClause items within the array
	// =========================================================================

	function moveSubClause(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= subClauses.length) return;

		const newSubClauses = [...subClauses];
		[newSubClauses[index], newSubClauses[newIndex]] = [
			newSubClauses[newIndex],
			newSubClauses[index]
		];
		onUpdate(newSubClauses);
	}

	// =========================================================================
	// INDENT - Move SubClause into previous sibling's nested subclauses
	// =========================================================================

	function indentSubClause(index: number) {
		// Cannot indent first item (no previous sibling)
		if (index === 0) return;
		// Cannot indent deeper than max depth
		if (depth >= MAX_SUBCLAUSE_DEPTH) return;

		const subClauseToIndent = subClauses[index];
		const previousSibling = subClauses[index - 1];

		// Add to previous sibling's blocks as nested subclause
		const updatedPrevious = appendNestedSubClause(previousSibling, subClauseToIndent);

		// Remove the indented subclause from current position
		const newSubClauses = [...subClauses];
		newSubClauses[index - 1] = updatedPrevious;
		newSubClauses.splice(index, 1);

		onUpdate(newSubClauses);
	}

	// =========================================================================
	// OUTDENT - Move SubClause up one level
	// =========================================================================

	function outdentSubClause(index: number) {
		const subClauseToOutdent = subClauses[index];

		if (depth === 1) {
			// At depth 1, outdent creates a new operative clause
			if (onOutdentToOperative) {
				const newOperative = subClauseToOperativeClause(subClauseToOutdent);
				// Remove from current subclauses
				const newSubClauses = subClauses.filter((_, i) => i !== index);
				onUpdate(newSubClauses);
				// Tell parent to insert new operative clause
				onOutdentToOperative(newOperative, -1); // -1 means "after current operative"
			}
		} else {
			// At depth > 1, outdent moves to parent's level
			if (onOutdentToParent && parentSubClauseIndex !== undefined) {
				// Remove from current subclauses
				const newSubClauses = subClauses.filter((_, i) => i !== index);
				onUpdate(newSubClauses);
				// Tell parent to insert after parentSubClauseIndex
				onOutdentToParent(subClauseToOutdent, parentSubClauseIndex);
			}
		}
	}

	// =========================================================================
	// ADD SIBLING - Insert new SubClause after current
	// =========================================================================

	function insertSubClauseAfter(index: number) {
		const newSubClauses = [...subClauses];
		newSubClauses.splice(index + 1, 0, createEmptySubClause());
		onUpdate(newSubClauses);
	}

	// =========================================================================
	// DELETE - Remove SubClause with cleanup
	// =========================================================================

	function deleteSubClause(index: number) {
		const newSubClauses = subClauses.filter((_, i) => i !== index);
		onUpdate(newSubClauses);
	}

	// =========================================================================
	// NESTED SUBCLAUSES MANAGEMENT
	// =========================================================================

	// Update a specific block's content within a subclause
	function updateBlockContent(subClauseIndex: number, blockIndex: number, content: string) {
		const newSubClauses = [...subClauses];
		const subClause = newSubClauses[subClauseIndex];
		const block = subClause.blocks[blockIndex];
		if (block.type === 'text') {
			const newBlocks = [...subClause.blocks];
			newBlocks[blockIndex] = { ...block, content };
			newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
			onUpdate(newSubClauses);
		}
	}

	// Update nested subclauses within a subclauses block
	function updateNestedSubClauses(
		subClauseIndex: number,
		blockIndex: number,
		nestedSubClauses: SubClause[]
	) {
		const newSubClauses = [...subClauses];
		const subClause = newSubClauses[subClauseIndex];
		const block = subClause.blocks[blockIndex];
		if (block.type === 'subclauses') {
			let newBlocks = [...subClause.blocks];
			if (nestedSubClauses.length > 0) {
				newBlocks[blockIndex] = { ...block, items: nestedSubClauses };
			} else {
				// Remove empty subclauses block and cleanup
				newBlocks.splice(blockIndex, 1);
				newBlocks = cleanupBlocks(newBlocks);
			}
			newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
			onUpdate(newSubClauses);
		}
	}

	// Handle outdent from nested subclause - insert after parent
	function handleNestedOutdent(subClauseIndex: number, blockIndex: number) {
		return (outdentedSubClause: SubClause, _afterIndex: number) => {
			// Insert the outdented subclause after subClauseIndex in our array
			const newSubClauses = [...subClauses];
			newSubClauses.splice(subClauseIndex + 1, 0, outdentedSubClause);
			onUpdate(newSubClauses);
		};
	}

	// Add a nested subclause array to a subclause (creates new subclauses block)
	function addNestedSubClause(subClauseIndex: number) {
		const newSubClauses = [...subClauses];
		const subClause = newSubClauses[subClauseIndex];
		const newBlocks: ClauseBlock[] = [
			...subClause.blocks,
			createSubclausesBlock([createEmptySubClause()])
		];
		newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
		onUpdate(newSubClauses);
	}

	// Add a continuation text block after a subclauses block
	function addContinuationText(subClauseIndex: number, afterBlockIndex: number) {
		const newSubClauses = [...subClauses];
		const subClause = newSubClauses[subClauseIndex];
		const newBlocks = [...subClause.blocks];
		newBlocks.splice(afterBlockIndex + 1, 0, createTextBlock());
		newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
		onUpdate(newSubClauses);
	}

	// Delete a block from a subclause (with cleanup)
	function deleteBlock(subClauseIndex: number, blockIndex: number) {
		const newSubClauses = [...subClauses];
		const subClause = newSubClauses[subClauseIndex];
		// Don't allow deleting the first text block
		if (blockIndex === 0) return;
		let newBlocks = subClause.blocks.filter((_, i) => i !== blockIndex);
		// Clean up consecutive blocks
		newBlocks = cleanupBlocks(newBlocks);
		newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
		onUpdate(newSubClauses);
	}

	// Check if subclause has any subclauses blocks
	function hasSubclausesBlock(subClause: SubClause): boolean {
		return subClause.blocks.some((b) => b.type === 'subclauses');
	}
</script>

<div class="space-y-2">
	{#each subClauses as subClause, subClauseIndex (subClause.id)}
		<div class="border-l-2 border-base-300 pl-2">
			{#each subClause.blocks as block, blockIndex (block.id)}
				{#if block.type === 'text'}
					<!-- Text block -->
					<div class="flex gap-2 items-start" class:mt-2={blockIndex > 0}>
						<!-- Label only for first text block -->
						{#if blockIndex === 0}
							<span class="text-sm font-medium text-base-content/70 min-w-10 pt-2 text-right">
								{getSubClauseLabel(subClauseIndex, depth)}
							</span>
						{:else}
							<span class="min-w-10"></span>
						{/if}

						<div class="flex-1">
							<textarea
								value={block.content}
								oninput={(e) =>
									updateBlockContent(subClauseIndex, blockIndex, e.currentTarget.value)}
								placeholder={blockIndex === 0
									? m.resolutionSubClausePlaceholder()
									: m.resolutionContinuationPlaceholder()}
								class="textarea textarea-bordered textarea-sm w-full min-h-14 resize-y text-sm leading-relaxed"
								rows="2"
							></textarea>

							<!-- Controls row - only show for first text block (main subclause controls) -->
							{#if blockIndex === 0}
								<div class="flex flex-wrap gap-0.5 mt-1">
									<!-- Move controls -->
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5"
										onclick={() => moveSubClause(subClauseIndex, 'up')}
										disabled={subClauseIndex === 0}
										title={m.resolutionMoveUp()}
									>
										<i class="fa-solid fa-chevron-up text-xs"></i>
									</button>
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5"
										onclick={() => moveSubClause(subClauseIndex, 'down')}
										disabled={subClauseIndex === subClauses.length - 1}
										title={m.resolutionMoveDown()}
									>
										<i class="fa-solid fa-chevron-down text-xs"></i>
									</button>

									<div class="divider divider-horizontal mx-0.5"></div>

									<!-- Indent (disabled for first item or at max depth) -->
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5"
										onclick={() => indentSubClause(subClauseIndex)}
										disabled={subClauseIndex === 0 || depth >= MAX_SUBCLAUSE_DEPTH}
										title={m.resolutionIndent()}
									>
										<i class="fa-solid fa-indent text-xs"></i>
									</button>

									<!-- Outdent (always available, behavior depends on depth) -->
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5"
										onclick={() => outdentSubClause(subClauseIndex)}
										title={m.resolutionOutdent()}
									>
										<i class="fa-solid fa-outdent text-xs"></i>
									</button>

									<div class="divider divider-horizontal mx-0.5"></div>

									<!-- Add sibling -->
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5 text-primary"
										onclick={() => insertSubClauseAfter(subClauseIndex)}
										title={m.resolutionAddSibling()}
									>
										<i class="fa-solid fa-plus text-xs"></i>
									</button>

									<!-- Add nested (only if no subclauses block yet and not at max depth) -->
									{#if depth < MAX_SUBCLAUSE_DEPTH && !hasSubclausesBlock(subClause)}
										<button
											type="button"
											class="btn btn-ghost btn-xs px-1.5 text-primary"
											onclick={() => addNestedSubClause(subClauseIndex)}
											title={m.resolutionAddNested()}
										>
											<i class="fa-solid fa-level-down text-xs"></i>
										</button>
									{/if}

									<div class="flex-1"></div>

									<!-- Delete -->
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5 text-error"
										onclick={() => deleteSubClause(subClauseIndex)}
										title={m.resolutionDeleteClause()}
									>
										<i class="fa-solid fa-trash text-xs"></i>
									</button>
								</div>
							{:else}
								<!-- Controls for continuation text blocks -->
								<div class="flex flex-wrap gap-1 mt-1">
									<div class="flex-1"></div>
									<button
										type="button"
										class="btn btn-ghost btn-xs px-1.5 text-error"
										onclick={() => deleteBlock(subClauseIndex, blockIndex)}
										title={m.resolutionDeleteBlock()}
									>
										<i class="fa-solid fa-trash text-xs"></i>
									</button>
								</div>
							{/if}
						</div>
					</div>
				{:else if block.type === 'subclauses'}
					<!-- Nested subclauses block -->
					<div class="ml-10 mt-2">
						<Self
							subClauses={block.items}
							depth={depth + 1}
							onUpdate={(items) => updateNestedSubClauses(subClauseIndex, blockIndex, items)}
							{onOutdentToOperative}
							parentSubClauseIndex={subClauseIndex}
							onOutdentToParent={handleNestedOutdent(subClauseIndex, blockIndex)}
						/>
						<!-- Add continuation text after subclauses -->
						<div class="mt-1 flex gap-1">
							<button
								type="button"
								class="btn btn-ghost btn-xs gap-1 text-primary"
								onclick={() => addContinuationText(subClauseIndex, blockIndex)}
							>
								<i class="fa-solid fa-paragraph text-xs"></i>
								{m.resolutionAddContinuation()}
							</button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/each}
</div>
