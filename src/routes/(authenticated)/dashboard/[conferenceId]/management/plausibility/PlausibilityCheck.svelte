<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	interface Props {
		headline: string;
		/** The rule that decides what is listed, in words. */
		rule: string;
		/** What was found; each entry is a button. */
		entries: { id: string; label: string }[];
		onSelect: (id: string) => void;
	}

	let { headline, rule, entries, onSelect }: Props = $props();
	const found = $derived(entries.length > 0);
</script>

<section class="bg-base-200 rounded-box flex flex-col gap-2 p-4">
	<h2 class="flex items-center gap-3 text-lg font-bold">
		<i
			class="fa-sharp-duotone fa-solid text-2xl {found
				? 'fa-circle-xmark text-error'
				: 'fa-circle-check text-success'}"
		></i>
		<span class="grow">{headline}</span>
		<span class="text-3xl tabular-nums {found ? '' : 'text-base-content/40'}">{entries.length}</span
		>
	</h2>
	<p class="text-base-content/60 text-xs">{rule}</p>
	<ul class="flex max-h-48 min-h-12 flex-col overflow-y-auto">
		{#each entries as entry (entry.id)}
			<li class="border-base-300 border-t first:border-t-0">
				<button
					type="button"
					class="hover:bg-base-300 flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-left"
					onclick={() => onSelect(entry.id)}
				>
					<span>{entry.label}</span>
					<i class="fa-sharp-duotone fa-solid fa-id-card text-base-content/60"></i>
				</button>
			</li>
		{:else}
			<li class="text-base-content/40 px-2 py-1.5 text-sm">{m.plausibilityNothingFound()}</li>
		{/each}
	</ul>
</section>
