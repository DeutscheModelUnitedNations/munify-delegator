<script lang="ts">
	import {
		type SubClause,
		type ClauseBlock,
		createEmptySubClause,
		createTextBlock,
		createSubclausesBlock,
		getSubClauseLabel,
		MAX_SUBCLAUSE_DEPTH
	} from '$lib/schemata/resolution';
	import { m } from '$lib/paraglide/messages';
	import Self from './SubClauseEditor.svelte';

	interface Props {
		subClauses: SubClause[];
		depth: number;
		onUpdate: (subClauses: SubClause[]) => void;
	}

	let { subClauses, depth, onUpdate }: Props = $props();

	function deleteSubClause(index: number) {
		onUpdate(subClauses.filter((_, i) => i !== index));
	}

	function insertSubClauseAfter(index: number) {
		const newSubClauses = [...subClauses];
		newSubClauses.splice(index + 1, 0, createEmptySubClause());
		onUpdate(newSubClauses);
	}

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
			const newBlocks = [...subClause.blocks];
			if (nestedSubClauses.length > 0) {
				newBlocks[blockIndex] = { ...block, items: nestedSubClauses };
			} else {
				// Remove empty subclauses block
				newBlocks.splice(blockIndex, 1);
			}
			newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
			onUpdate(newSubClauses);
		}
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

	// Delete a block from a subclause
	function deleteBlock(subClauseIndex: number, blockIndex: number) {
		const newSubClauses = [...subClauses];
		const subClause = newSubClauses[subClauseIndex];
		// Don't allow deleting the first text block
		if (blockIndex === 0) return;
		const newBlocks = subClause.blocks.filter((_, i) => i !== blockIndex);
		newSubClauses[subClauseIndex] = { ...subClause, blocks: newBlocks };
		onUpdate(newSubClauses);
	}

	// Check if subclause has any subclauses blocks
	function hasSubclausesBlock(subClause: SubClause): boolean {
		return subClause.blocks.some((b) => b.type === 'subclauses');
	}

	// Calculate indentation based on depth
	const indentClass = `ml-${depth * 4}`;
</script>

<div class="space-y-3 {indentClass}">
	{#each subClauses as subClause, subClauseIndex (subClause.id)}
		<div class="flex flex-col gap-2 border-l-2 border-base-300 pl-3">
			{#each subClause.blocks as block, blockIndex (block.id)}
				{#if block.type === 'text'}
					<!-- Text block -->
					<div class="flex gap-2 items-start">
						<!-- Label only for first text block -->
						{#if blockIndex === 0}
							<span class="text-sm font-medium text-base-content/70 min-w-12 pt-2">
								{getSubClauseLabel(subClauseIndex, depth)}
							</span>
						{:else}
							<span class="min-w-12"></span>
						{/if}

						<div class="flex-1 flex flex-col gap-1">
							<textarea
								value={block.content}
								oninput={(e) =>
									updateBlockContent(subClauseIndex, blockIndex, e.currentTarget.value)}
								placeholder={blockIndex === 0
									? m.resolutionSubClausePlaceholder()
									: m.resolutionContinuationPlaceholder()}
								class="textarea textarea-bordered textarea-sm w-full min-h-16 resize-y text-sm leading-relaxed"
								rows="2"
							></textarea>

							<!-- Block action buttons -->
							<div class="flex flex-wrap gap-1">
								<div class="flex-1"></div>
								{#if blockIndex > 0}
									<button
										type="button"
										class="btn btn-ghost btn-xs gap-1 text-error"
										onclick={() => deleteBlock(subClauseIndex, blockIndex)}
									>
										<i class="fa-solid fa-trash"></i>
										{m.resolutionDeleteBlock()}
									</button>
								{/if}
							</div>
						</div>
					</div>
				{:else if block.type === 'subclauses'}
					<!-- Nested subclauses block -->
					<div class="ml-12">
						<Self
							subClauses={block.items}
							depth={depth + 1}
							onUpdate={(items) => updateNestedSubClauses(subClauseIndex, blockIndex, items)}
						/>
						<!-- Add continuation text after subclauses -->
						<div class="mt-2 flex gap-1">
							<button
								type="button"
								class="btn btn-ghost btn-xs gap-1 text-primary"
								onclick={() => addContinuationText(subClauseIndex, blockIndex)}
							>
								<i class="fa-solid fa-paragraph"></i>
								{m.resolutionAddContinuation()}
							</button>
						</div>
					</div>
				{/if}
			{/each}

			<!-- SubClause action buttons row -->
			<div class="flex flex-wrap gap-1 ml-14">
				<div class="flex-1"></div>

				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1"
					onclick={() => moveSubClause(subClauseIndex, 'up')}
					disabled={subClauseIndex === 0}
				>
					<i class="fa-solid fa-chevron-up"></i>
					{m.resolutionMoveUp()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1"
					onclick={() => moveSubClause(subClauseIndex, 'down')}
					disabled={subClauseIndex === subClauses.length - 1}
				>
					<i class="fa-solid fa-chevron-down"></i>
					{m.resolutionMoveDown()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1 text-primary"
					onclick={() => insertSubClauseAfter(subClauseIndex)}
				>
					<i class="fa-solid fa-plus"></i>
					{m.resolutionAddSibling()}
				</button>
				{#if depth < MAX_SUBCLAUSE_DEPTH && !hasSubclausesBlock(subClause)}
					<button
						type="button"
						class="btn btn-ghost btn-xs gap-1 text-primary"
						onclick={() => addNestedSubClause(subClauseIndex)}
					>
						<i class="fa-solid fa-indent"></i>
						{m.resolutionAddNested()}
					</button>
				{/if}
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1 text-error"
					onclick={() => deleteSubClause(subClauseIndex)}
				>
					<i class="fa-solid fa-trash"></i>
					{m.resolutionDeleteClause()}
				</button>
			</div>
		</div>
	{/each}
</div>
