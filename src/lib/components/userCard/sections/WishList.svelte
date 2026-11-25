<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Flag from '#lib/components/Flag.svelte';
	import Row from '../ui/Row.svelte';
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

<Row icon="list-numbers" title={m.appliedForRoles()}>
	{#if wishes.length === 0}
		<span class="text-base-content/60">–</span>
	{:else}
		<ol class="flex flex-col gap-1">
			{#each wishes as wish, index (wish.id)}
				<li class="group flex min-h-8 items-center gap-3">
					<span class="text-base-content/50 w-4 text-right font-bold tabular-nums">
						{index + 1}
					</span>
					<Flag
						alpha2Code={wish.alpha2Code}
						nsa={!wish.alpha2Code}
						icon={wish.icon ?? undefined}
						size="xs"
					/>
					<span>{wish.label}</span>
					{#if onMoveUp && index > 0}
						<button
							class="btn btn-ghost btn-xs btn-square opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
							title={m.moveUp()}
							aria-label={m.moveUp()}
							disabled={busy}
							onclick={() => onMoveUp(wish, wishes[index - 1])}
						>
							<i aria-hidden="true" class="ph-duotone ph-arrow-up text-base"></i>
						</button>
					{/if}
					{#if onRemove}
						<button
							class="btn btn-ghost btn-xs btn-square hover:text-error opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
							title={m.delete()}
							aria-label={m.delete()}
							disabled={busy}
							onclick={() => onRemove(wish)}
						>
							<i aria-hidden="true" class="ph-duotone ph-x text-base"></i>
						</button>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</Row>
