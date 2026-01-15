<script lang="ts">
	import { m } from '$lib/paraglide/messages';

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

<div class="flex flex-col gap-2">
	<!-- Clause content row -->
	<div class="flex gap-2 items-start">
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
	</div>

	<!-- Action buttons row -->
	<div class="flex flex-wrap gap-1 {label ? 'ml-10' : ''}">
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
		{#if showAddSubClause && onAddSubClause}
			<button
				type="button"
				class="btn btn-ghost btn-xs gap-1 text-primary"
				onclick={onAddSubClause}
			>
				<i class="fa-solid fa-indent"></i>
				{m.resolutionAddSubClause()}
			</button>
		{/if}
		<button
			type="button"
			class="btn btn-ghost btn-xs gap-1 text-error"
			onclick={onDelete}
		>
			<i class="fa-solid fa-trash"></i>
			{m.resolutionDeleteClause()}
		</button>
	</div>
</div>
