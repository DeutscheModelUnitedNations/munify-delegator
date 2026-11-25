<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { openUserCard } from '../userCardState.svelte';

	/** A person as a row: a click anywhere on it opens their card, unless it is the card's own person. */
	interface Props {
		user: { id: string; givenName?: string | null; familyName?: string | null };
		isHeadDelegate?: boolean;
		/** The card is this person's */
		current?: boolean;
		/** A line below the name */
		children?: Snippet;
		/** At the end of the row */
		trailing?: Snippet;
	}

	let { user, isHeadDelegate = false, current = false, children, trailing }: Props = $props();
</script>

{#snippet name()}
	<span class="capitalize">{user.givenName}</span>
	<span class="uppercase">{user.familyName}</span>
{/snippet}

<li
	class="group relative flex items-center gap-3 py-1 pl-9 text-sm {current
		? ''
		: 'hover:text-primary'}"
>
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="flex flex-wrap items-center gap-x-2">
			{#if current}
				<span class="font-bold">{@render name()}</span>
			{:else}
				<!-- Stretched over the row, below what else it holds -->
				<button
					type="button"
					class="cursor-pointer text-left after:absolute after:inset-0"
					onclick={() => openUserCard(user.id)}
				>
					{@render name()}
				</button>
			{/if}
			{#if isHeadDelegate}
				<span class="text-accent" title={m.headDelegate()}>
					<i aria-hidden="true" class="ph-fill ph-medal"></i>
					<span class="sr-only">{m.headDelegate()}</span>
				</span>
			{/if}
		</span>
		{@render children?.()}
	</div>
	{#if trailing}
		<div class="relative z-1 flex items-center gap-1">{@render trailing()}</div>
	{/if}
</li>
