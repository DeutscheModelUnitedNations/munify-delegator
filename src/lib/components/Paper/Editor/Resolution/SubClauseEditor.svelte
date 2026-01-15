<script lang="ts">
	import {
		type SubClause,
		generateSubClauseId,
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
		const newSubClause: SubClause = {
			id: generateSubClauseId(),
			content: ''
		};
		const newSubClauses = [...subClauses];
		newSubClauses.splice(index + 1, 0, newSubClause);
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

<div class="space-y-3 {indentClass}">
	{#each subClauses as subClause, index (subClause.id)}
		<div class="flex flex-col gap-2">
			<!-- Sub-clause content row -->
			<div class="flex gap-2 items-start">
				<!-- Label -->
				<span class="text-sm font-medium text-base-content/70 min-w-12 pt-2">
					{getSubClauseLabel(index, depth)}
				</span>

				<!-- Textarea -->
				<textarea
					value={subClause.content}
					oninput={(e) => updateContent(index, e.currentTarget.value)}
					placeholder={m.resolutionSubClausePlaceholder()}
					class="textarea textarea-bordered textarea-sm flex-1 min-h-16 resize-y text-sm leading-relaxed"
					rows="2"
				></textarea>
			</div>

			<!-- Action buttons row -->
			<div class="flex flex-wrap gap-1 ml-14">
				<div class="flex-1"></div>

				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1"
					onclick={() => moveSubClause(index, 'up')}
					disabled={index === 0}
				>
					<i class="fa-solid fa-chevron-up"></i>
					{m.resolutionMoveUp()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1"
					onclick={() => moveSubClause(index, 'down')}
					disabled={index === subClauses.length - 1}
				>
					<i class="fa-solid fa-chevron-down"></i>
					{m.resolutionMoveDown()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1 text-primary"
					onclick={() => insertSubClauseAfter(index)}
				>
					<i class="fa-solid fa-plus"></i>
					{m.resolutionAddSibling()}
				</button>
				{#if depth < MAX_SUBCLAUSE_DEPTH}
					<button
						type="button"
						class="btn btn-ghost btn-xs gap-1 text-primary"
						onclick={() => addChildSubClause(index)}
					>
						<i class="fa-solid fa-indent"></i>
						{m.resolutionAddNested()}
					</button>
				{/if}
				<button
					type="button"
					class="btn btn-ghost btn-xs gap-1 text-error"
					onclick={() => deleteSubClause(index)}
				>
					<i class="fa-solid fa-trash"></i>
					{m.resolutionDeleteClause()}
				</button>
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
</div>
