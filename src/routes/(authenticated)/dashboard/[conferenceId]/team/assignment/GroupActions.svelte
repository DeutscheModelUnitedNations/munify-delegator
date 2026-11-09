<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The buttons of a group card; a button shows only when its action applies. */
	interface Props {
		onSplit?: () => void;
		onUndoSplit?: () => void;
	}

	let { onSplit, onUndoSplit }: Props = $props();

	const actions = $derived(
		[
			{ run: onSplit, label: m.assignmentCardSplit(), icon: 'arrows-split' },
			{ run: onUndoSplit, label: m.assignmentCardUndoSplit(), icon: 'selection-all' }
		].filter((action) => action.run)
	);
</script>

{#if actions.length > 0}
	<div class="flex gap-0.5">
		{#each actions as action (action.icon)}
			<button
				class="btn btn-ghost btn-xs btn-square"
				aria-label={action.label}
				title={action.label}
				onclick={action.run}
			>
				<i aria-hidden="true" class="ph-duotone ph-{action.icon}"></i>
			</button>
		{/each}
	</div>
{/if}
