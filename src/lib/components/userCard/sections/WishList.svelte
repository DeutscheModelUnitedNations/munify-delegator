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
		/** Given where the caller may change the wishes: takes one out. */
		onRemove?: (wish: Wish) => void;
		/** Given where the caller may change the wishes: swaps a wish with the one ranked above it. */
		onMoveUp?: (wish: Wish, above: Wish) => void;
		/** While a change is under way the buttons wait. */
		busy?: boolean;
	}

	let { wishes, onRemove, onMoveUp, busy = false }: Props = $props();
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
					{#if onMoveUp && index > 0}
						<button
							class="btn btn-ghost btn-xs btn-square"
							title={m.moveUp()}
							aria-label={m.moveUp()}
							disabled={busy}
							onclick={() => onMoveUp(wish, wishes[index - 1])}
						>
							<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
						</button>
					{/if}
					{#if onRemove}
						<button
							class="btn btn-ghost btn-xs btn-square text-error"
							title={m.delete()}
							aria-label={m.delete()}
							disabled={busy}
							onclick={() => onRemove(wish)}
						>
							<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
						</button>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</InfoRow>
