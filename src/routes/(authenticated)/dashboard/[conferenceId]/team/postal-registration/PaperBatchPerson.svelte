<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { PersonResult } from './paperBatch';
	import PaperReading from './PaperReading.svelte';

	/** A person's line of a batch's report. */
	interface Props {
		person: PersonResult;
	}

	let { person }: Props = $props();
</script>

<li class="flex flex-col gap-1 py-2">
	<span class="flex flex-wrap items-baseline gap-x-3">
		<span class="font-semibold">{person.name}</span>
		<span class="text-base-content/60 text-xs">{m.paperBatchPages({ count: person.pages })}</span>
		{#if person.stored > 0}
			<span class="text-success text-xs">
				<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
				{m.paperBatchStored({ count: person.stored })}
			</span>
		{/if}
		{#if person.replaced > 0}
			<span class="text-info text-xs">{m.paperBatchReplaced({ count: person.replaced })}</span>
		{/if}
		{#if person.known > 0}
			<span class="text-base-content/60 text-xs">
				{m.paperBatchKnown({ count: person.known })}
			</span>
		{/if}
	</span>
	{#if person.missing}
		<span class="text-warning text-sm">{m.paperBatchNotRegistered()}</span>
	{/if}
	{#if person.error}
		<span class="text-error text-sm">{m.paperBatchSaveFailed({ error: person.error })}</span>
	{/if}
	{#if person.unreadable > 0}
		<span class="text-warning text-sm">{m.paperBatchUnreadable({ count: person.unreadable })}</span>
	{/if}
	<PaperReading change={person.change} notes={person.notes} applied={!person.missing} />
</li>
