<script lang="ts">
	interface Props {
		content: string;
		placeholder?: string;
		label?: string;
		onMoveUp?: () => void;
		onMoveDown?: () => void;
		onDelete?: () => void;
		onAddSubClause?: () => void;
		canMoveUp?: boolean;
		canMoveDown?: boolean;
		showAddSubClause?: boolean;
		validationError?: string;
	}

	let {
		content = $bindable(),
		placeholder = '',
		label = '',
		onMoveUp,
		onMoveDown,
		onDelete,
		onAddSubClause,
		canMoveUp = true,
		canMoveDown = true,
		showAddSubClause = false,
		validationError
	}: Props = $props();
</script>

<div class="flex flex-col gap-1">
	<div class="flex gap-2 items-start group">
		<!-- Clause label (optional) -->
		{#if label}
			<span class="text-sm font-medium text-base-content/70 min-w-8 pt-2">{label}</span>
		{/if}

		<!-- Textarea for clause content -->
		<textarea
			bind:value={content}
			{placeholder}
			class="textarea textarea-bordered flex-1 min-h-20 resize-y text-sm leading-relaxed"
			class:textarea-warning={validationError}
			rows="2"
		></textarea>

		<!-- Action buttons -->
		<div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
			{#if validationError}
				<div class="tooltip tooltip-left" data-tip={validationError}>
					<span class="btn btn-ghost btn-xs btn-square text-warning">
						<i class="fa-solid fa-triangle-exclamation"></i>
					</span>
				</div>
			{/if}
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-square"
			onclick={onMoveUp}
			disabled={!canMoveUp}
			title="Move up"
		>
			<i class="fa-solid fa-chevron-up"></i>
		</button>
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-square"
			onclick={onMoveDown}
			disabled={!canMoveDown}
			title="Move down"
		>
			<i class="fa-solid fa-chevron-down"></i>
		</button>
		<button
			type="button"
			class="btn btn-ghost btn-xs btn-square text-error"
			onclick={onDelete}
			title="Delete"
		>
			<i class="fa-solid fa-trash"></i>
		</button>
		{#if showAddSubClause && onAddSubClause}
			<button
				type="button"
				class="btn btn-ghost btn-xs btn-square text-primary"
				onclick={onAddSubClause}
				title="Add sub-clause"
			>
				<i class="fa-solid fa-indent"></i>
			</button>
		{/if}
		</div>
	</div>
</div>
