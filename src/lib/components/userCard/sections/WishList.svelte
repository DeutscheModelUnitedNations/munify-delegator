<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Flag from '#lib/components/Flag.svelte';
	import InfoRow from './InfoRow.svelte';
	import type { Wish } from './wishes';

	/**
	 * The roles an application wished for, in the order it ranked them, as a list row. A wish with
	 * `alpha2Code` shows the nation's flag, any other its `icon`.
	 */
	interface Props {
		wishes: readonly Wish[];
	}

	let { wishes }: Props = $props();
</script>

<InfoRow title={m.appliedForRoles()} faIcon="list-ol">
	{#if wishes.length === 0}
		<span class="text-base-content/60 text-sm">–</span>
	{:else}
		<ol class="mt-1 flex flex-wrap gap-2">
			{#each wishes as wish, index (wish.id)}
				<li class="bg-base-100 rounded-field flex items-center gap-2 py-1 pr-3 pl-2 text-sm">
					<span class="text-base-content/50 font-mono text-xs">{index + 1}</span>
					<Flag
						alpha2Code={wish.alpha2Code}
						nsa={!wish.alpha2Code}
						icon={wish.icon ?? undefined}
						size="xs"
					/>
					<span>{wish.label}</span>
				</li>
			{/each}
		</ol>
	{/if}
</InfoRow>
