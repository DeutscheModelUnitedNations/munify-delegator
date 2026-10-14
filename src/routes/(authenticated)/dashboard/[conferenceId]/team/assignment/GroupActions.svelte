<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** The buttons of a group card; a button shows only when its action applies. */
	interface Props {
		onSplit?: () => void;
		onUndoSplit?: () => void;
	}

	let { onSplit, onUndoSplit }: Props = $props();

	const actions = $derived(
		[
			{ run: onSplit, label: m.assignmentCardSplit(), icon: 'split' },
			{ run: onUndoSplit, label: m.assignmentCardUndoSplit(), icon: 'object-group' }
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
				<i class="fa-sharp-duotone fa-solid fa-{action.icon}"></i>
			</button>
		{/each}
	</div>
{/if}
