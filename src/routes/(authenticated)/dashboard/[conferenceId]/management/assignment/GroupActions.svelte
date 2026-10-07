<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** The buttons of a group card; a button shows only when its action applies. */
	interface Props {
		onSplit?: () => void;
		onUndoSplit?: () => void;
		onUnassign?: () => void;
	}

	let { onSplit, onUndoSplit, onUnassign }: Props = $props();

	const actions = $derived(
		[
			{ run: onSplit, label: m.assignmentSplit(), icon: 'split' },
			{ run: onUndoSplit, label: m.assignmentUndoSplit(), icon: 'object-group' },
			{ run: onUnassign, label: m.assignmentUnassign(), icon: 'xmark' }
		].filter((action) => action.run)
	);
</script>

{#if actions.length > 0}
	<div class="flex justify-end gap-1">
		{#each actions as action (action.icon)}
			<button
				class="btn btn-ghost btn-xs btn-square"
				aria-label={action.label}
				title={action.label}
				onclick={action.run}
			>
				<i class="fa-duotone fa-{action.icon}"></i>
			</button>
		{/each}
	</div>
{/if}
