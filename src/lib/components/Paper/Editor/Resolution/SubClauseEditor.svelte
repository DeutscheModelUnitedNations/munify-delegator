<script lang="ts">
	import {
		type SubClause,
		generateSubClauseId,
		getSubClauseLabel,
		MAX_SUBCLAUSE_DEPTH
	} from '$lib/schemata/resolution';
	import Self from './SubClauseEditor.svelte';

	interface Props {
		subClauses: SubClause[];
		depth: number;
		onUpdate: (subClauses: SubClause[]) => void;
	}

	let { subClauses, depth, onUpdate }: Props = $props();

	function addSubClause() {
		const newSubClause: SubClause = {
			id: generateSubClauseId(),
			content: ''
		};
		onUpdate([...subClauses, newSubClause]);
	}

	function deleteSubClause(index: number) {
		onUpdate(subClauses.filter((_, i) => i !== index));
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

	function updateContent(index: number, content: string) {
		const newSubClauses = [...subClauses];
		newSubClauses[index] = { ...newSubClauses[index], content };
		onUpdate(newSubClauses);
	}

	function updateChildren(index: number, children: SubClause[]) {
		const newSubClauses = [...subClauses];
		newSubClauses[index] = {
			...newSubClauses[index],
			children: children.length > 0 ? children : undefined
		};
		onUpdate(newSubClauses);
	}

	function addChildSubClause(index: number) {
		const newChild: SubClause = {
			id: generateSubClauseId(),
			content: ''
		};
		const newSubClauses = [...subClauses];
		newSubClauses[index] = {
			...newSubClauses[index],
			children: [...(newSubClauses[index].children ?? []), newChild]
		};
		onUpdate(newSubClauses);
	}

	// Calculate indentation based on depth
	const indentClass = `ml-${depth * 4}`;
</script>

<div class="space-y-2 {indentClass}">
	{#each subClauses as subClause, index (subClause.id)}
		<div class="flex flex-col gap-1">
			<!-- Sub-clause row -->
			<div class="flex gap-2 items-start group">
				<!-- Label -->
				<span class="text-sm font-medium text-base-content/70 min-w-12 pt-2">
					{getSubClauseLabel(index, depth)}
				</span>

				<!-- Textarea -->
				<textarea
					value={subClause.content}
					oninput={(e) => updateContent(index, e.currentTarget.value)}
					placeholder="Enter sub-clause content..."
					class="textarea textarea-bordered textarea-sm flex-1 min-h-16 resize-y text-sm leading-relaxed"
					rows="2"
				></textarea>

				<!-- Action buttons -->
				<div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-square"
						onclick={() => moveSubClause(index, 'up')}
						disabled={index === 0}
						title="Move up"
					>
						<i class="fa-solid fa-chevron-up"></i>
					</button>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-square"
						onclick={() => moveSubClause(index, 'down')}
						disabled={index === subClauses.length - 1}
						title="Move down"
					>
						<i class="fa-solid fa-chevron-down"></i>
					</button>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-square text-error"
						onclick={() => deleteSubClause(index)}
						title="Delete"
					>
						<i class="fa-solid fa-trash"></i>
					</button>
					{#if depth < MAX_SUBCLAUSE_DEPTH}
						<button
							type="button"
							class="btn btn-ghost btn-xs btn-square text-primary"
							onclick={() => addChildSubClause(index)}
							title="Add nested sub-clause"
						>
							<i class="fa-solid fa-plus"></i>
						</button>
					{/if}
				</div>
			</div>

			<!-- Nested sub-clauses (recursive) -->
			{#if subClause.children && subClause.children.length > 0}
				<Self
					subClauses={subClause.children}
					depth={depth + 1}
					onUpdate={(children) => updateChildren(index, children)}
				/>
			{/if}
		</div>
	{/each}

	<!-- Add sub-clause button -->
	<button
		type="button"
		class="btn btn-ghost btn-xs text-base-content/50 hover:text-base-content"
		onclick={addSubClause}
	>
		<i class="fa-solid fa-plus"></i>
		Add {depth === 1 ? 'Sub-clause' : 'Nested'}
	</button>
</div>
