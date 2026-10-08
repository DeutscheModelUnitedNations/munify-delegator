<script lang="ts" module>
	export interface ScanHistoryEntry {
		id: string;
		name: string;
	}
</script>

<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		entries: ScanHistoryEntry[];
		/** The entry currently shown, highlighted */
		activeId: string | null;
		onSelect: (id: string) => void;
	}

	let { entries, activeId, onSelect }: Props = $props();
</script>

{#if entries.length > 0}
	<section class="flex flex-col gap-1" aria-label={m.history()}>
		<h3 class="px-1 text-sm font-semibold text-base-content/60">{m.history()}</h3>
		<ul class="menu w-full rounded-box border border-base-300 bg-base-100 p-1">
			{#each entries as entry (entry.id)}
				<li>
					<button
						type="button"
						class="flex items-center gap-3 {entry.id === activeId ? 'bg-primary/20' : ''}"
						onclick={() => onSelect(entry.id)}
					>
						<i class="fa-sharp-duotone fa-solid fa-clock-rotate-left text-base-content/50"></i>
						<span class="truncate font-medium">{entry.name}</span>
						<span class="ml-auto truncate font-mono text-xs text-base-content/50">{entry.id}</span>
					</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
