<script lang="ts">
	import {
		type Resolution,
		type PreambleClause,
		type OperativeClause,
		type SubClause,
		createEmptyResolution,
		generateClauseId,
		generateSubClauseId
	} from '$lib/schemata/resolution';
	import { editorContentStore } from '../editorStore';
	import ClauseEditor from './ClauseEditor.svelte';
	import SubClauseEditor from './SubClauseEditor.svelte';
	import ResolutionPreview from './ResolutionPreview.svelte';

	interface Props {
		committeeName: string;
		initialContent?: Resolution;
		editable?: boolean;
	}

	let { committeeName, initialContent, editable = true }: Props = $props();

	// Initialize resolution state
	let resolution = $state<Resolution>(
		initialContent ?? ($editorContentStore as Resolution) ?? createEmptyResolution(committeeName)
	);

	// Ensure committeeName is always current
	$effect(() => {
		resolution.committeeName = committeeName;
	});

	// Sync resolution to editorContentStore for persistence
	$effect(() => {
		$editorContentStore = resolution;
	});

	// Mode toggle
	let mode = $state<'edit' | 'preview'>('edit');

	// Preamble clause management
	function addPreambleClause() {
		const newClause: PreambleClause = {
			id: generateClauseId('p'),
			content: ''
		};
		resolution.preamble = [...resolution.preamble, newClause];
	}

	function deletePreambleClause(index: number) {
		resolution.preamble = resolution.preamble.filter((_, i) => i !== index);
	}

	function movePreambleClause(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= resolution.preamble.length) return;

		const newPreamble = [...resolution.preamble];
		[newPreamble[index], newPreamble[newIndex]] = [newPreamble[newIndex], newPreamble[index]];
		resolution.preamble = newPreamble;
	}

	// Operative clause management
	function addOperativeClause() {
		const newClause: OperativeClause = {
			id: generateClauseId('o'),
			content: ''
		};
		resolution.operative = [...resolution.operative, newClause];
	}

	function deleteOperativeClause(index: number) {
		resolution.operative = resolution.operative.filter((_, i) => i !== index);
	}

	function moveOperativeClause(index: number, direction: 'up' | 'down') {
		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= resolution.operative.length) return;

		const newOperative = [...resolution.operative];
		[newOperative[index], newOperative[newIndex]] = [newOperative[newIndex], newOperative[index]];
		resolution.operative = newOperative;
	}

	// Sub-clause management
	function addSubClauseToOperative(operativeIndex: number) {
		const newSubClause: SubClause = {
			id: generateSubClauseId(),
			content: ''
		};
		const newOperative = [...resolution.operative];
		newOperative[operativeIndex] = {
			...newOperative[operativeIndex],
			subClauses: [...(newOperative[operativeIndex].subClauses ?? []), newSubClause]
		};
		resolution.operative = newOperative;
	}

	function updateSubClauses(operativeIndex: number, subClauses: SubClause[]) {
		const newOperative = [...resolution.operative];
		newOperative[operativeIndex] = {
			...newOperative[operativeIndex],
			subClauses: subClauses.length > 0 ? subClauses : undefined
		};
		resolution.operative = newOperative;
	}
</script>

<fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-full border p-4">
	<legend class="fieldset-legend flex items-center gap-2">
		<span>{editable ? 'Resolution Editor' : 'Resolution'}</span>
		{#if editable}
			<div class="join ml-4">
				<button
					type="button"
					class="btn btn-xs join-item"
					class:btn-active={mode === 'edit'}
					onclick={() => (mode = 'edit')}
				>
					<i class="fa-solid fa-pen"></i>
					Edit
				</button>
				<button
					type="button"
					class="btn btn-xs join-item"
					class:btn-active={mode === 'preview'}
					onclick={() => (mode = 'preview')}
				>
					<i class="fa-solid fa-eye"></i>
					Preview
				</button>
			</div>
		{/if}
	</legend>

	{#if mode === 'edit' && editable}
		<!-- Edit Mode -->
		<div class="space-y-6">
			<!-- Header (non-editable) -->
			<div class="bg-base-100 rounded-lg p-3 border border-base-300">
				<div class="text-xs text-base-content/50 mb-1">Committee</div>
				<div class="font-bold uppercase tracking-wide">{committeeName},</div>
			</div>

			<!-- Preamble Section -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-base-content/80">
						<i class="fa-solid fa-quote-left mr-2"></i>
						Preamble Clauses
					</h3>
					<button type="button" class="btn btn-sm btn-ghost" onclick={addPreambleClause}>
						<i class="fa-solid fa-plus"></i>
						Add Clause
					</button>
				</div>

				{#if resolution.preamble.length === 0}
					<div class="text-center py-4 text-base-content/50 bg-base-100 rounded-lg border border-dashed border-base-300">
						<p class="text-sm">No preamble clauses yet.</p>
						<button type="button" class="btn btn-sm btn-ghost mt-2" onclick={addPreambleClause}>
							<i class="fa-solid fa-plus"></i>
							Add First Clause
						</button>
					</div>
				{:else}
					<div class="space-y-2">
						{#each resolution.preamble as clause, index (clause.id)}
							<ClauseEditor
								bind:content={clause.content}
								placeholder="e.g., Recalling the Charter of the United Nations..."
								canMoveUp={index > 0}
								canMoveDown={index < resolution.preamble.length - 1}
								onMoveUp={() => movePreambleClause(index, 'up')}
								onMoveDown={() => movePreambleClause(index, 'down')}
								onDelete={() => deletePreambleClause(index)}
							/>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Operative Section -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-base-content/80">
						<i class="fa-solid fa-list-ol mr-2"></i>
						Operative Clauses
					</h3>
					<button type="button" class="btn btn-sm btn-ghost" onclick={addOperativeClause}>
						<i class="fa-solid fa-plus"></i>
						Add Clause
					</button>
				</div>

				{#if resolution.operative.length === 0}
					<div class="text-center py-4 text-base-content/50 bg-base-100 rounded-lg border border-dashed border-base-300">
						<p class="text-sm">No operative clauses yet.</p>
						<button type="button" class="btn btn-sm btn-ghost mt-2" onclick={addOperativeClause}>
							<i class="fa-solid fa-plus"></i>
							Add First Clause
						</button>
					</div>
				{:else}
					<div class="space-y-4">
						{#each resolution.operative as clause, index (clause.id)}
							<div class="bg-base-100 rounded-lg p-3 border border-base-300">
								<ClauseEditor
									bind:content={clause.content}
									label="{index + 1}."
									placeholder="e.g., Decides to establish a monitoring mechanism..."
									canMoveUp={index > 0}
									canMoveDown={index < resolution.operative.length - 1}
									onMoveUp={() => moveOperativeClause(index, 'up')}
									onMoveDown={() => moveOperativeClause(index, 'down')}
									onDelete={() => deleteOperativeClause(index)}
									showAddSubClause={true}
									onAddSubClause={() => addSubClauseToOperative(index)}
								/>

								<!-- Sub-clauses -->
								{#if clause.subClauses && clause.subClauses.length > 0}
									<div class="mt-3 pt-3 border-t border-base-200">
										<SubClauseEditor
											subClauses={clause.subClauses}
											depth={1}
											onUpdate={(subClauses) => updateSubClauses(index, subClauses)}
										/>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Preview Mode -->
		<ResolutionPreview {resolution} />
	{/if}
</fieldset>
