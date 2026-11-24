<script lang="ts">
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';

	/**
	 * A row of a user card list (`bg-base-200 rounded-box divide-y`) that unfolds its content below
	 * itself: an icon, what it is and a line summing it up while folded. `actions` stand beside the
	 * button that unfolds it; without `children` there is nothing to unfold.
	 */
	interface Props {
		/** Phosphor icon name (without the `ph-` prefix) */
		icon: string;
		title: string;
		value?: string;
		/** The value says something is amiss */
		warning?: boolean;
		/** Starts out unfolded */
		unfolded?: boolean;
		children?: Snippet;
		actions?: Snippet;
	}

	let {
		icon,
		title,
		value,
		warning = false,
		unfolded = false,
		children,
		actions
	}: Props = $props();

	const contentId = $props.id();
	let expanded = $state(untrack(() => unfolded));
</script>

{#snippet summary()}
	<i aria-hidden="true" class="ph-duotone ph-{icon} text-base-content/60 w-5 text-center"></i>
	<span class="flex min-w-0 grow flex-col text-sm">
		<span>{title}</span>
		{#if value}
			<span class={warning ? 'text-warning' : 'text-base-content/60'}>{value}</span>
		{/if}
	</span>
{/snippet}

<div>
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5">
		{#if children}
			<button
				type="button"
				class="flex min-w-32 flex-1 cursor-pointer items-center gap-3 text-left"
				aria-expanded={expanded}
				aria-controls={expanded ? contentId : undefined}
				onclick={() => (expanded = !expanded)}
			>
				{@render summary()}
				<i
					aria-hidden="true"
					class="ph-duotone ph-caret-down mr-2 transition-transform duration-200 {expanded
						? 'rotate-180'
						: ''}"
				></i>
			</button>
		{:else}
			<div class="flex min-w-32 flex-1 items-center gap-3">
				{@render summary()}
			</div>
		{/if}
		{@render actions?.()}
	</div>
	{#if expanded && children}
		<div id={contentId} class="px-4 pb-4" transition:slide={{ duration: 200 }}>
			{@render children()}
		</div>
	{/if}
</div>
