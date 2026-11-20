<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { PaperChange, PaperNote } from '#lib/paperScan/proposal';
	import { describeChange, describeNote } from './paperText';

	/** What was read off a person's paper: what it changes, and what was left for a person. */
	interface Props {
		change: PaperChange;
		notes: PaperNote[];
		/** Whether the change is still to be confirmed (the camera) or was saved (a batch). */
		applied?: boolean;
	}

	let { change, notes, applied = false }: Props = $props();
	const lines = $derived(describeChange(change));
</script>

<div class="flex flex-col gap-1 text-sm">
	{#each lines as line (line)}
		<span class="flex items-center gap-2">
			<i
				aria-hidden="true"
				class="ph-duotone {applied
					? 'ph-check-circle text-success'
					: 'ph-arrow-circle-right text-info'}"
			></i>
			{line}
		</span>
	{:else}
		<span class="text-base-content/70">{m.paperNothingToChange()}</span>
	{/each}
	{#each notes as note (note)}
		<span class="flex items-center gap-2">
			<i aria-hidden="true" class="ph-duotone ph-warning text-warning"></i>
			{describeNote(note)}
		</span>
	{/each}
</div>
