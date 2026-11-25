<script lang="ts">
	import type { Snippet } from 'svelte';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import ToneIcon from '../ui/ToneIcon.svelte';

	/**
	 * A row of a `Section` that unfolds its content below
	 * itself: an icon, what it is and a line summing it up while folded. `actions` stand beside the
	 * button that unfolds it; without `children` there is nothing to unfold.
	 */
	interface Props {
		/** Phosphor icon name (without the `ph-` prefix) */
		icon: string;
		title: string;
		value?: string;
		/** Starts out unfolded */
		unfolded?: boolean;
		children?: Snippet;
		actions?: Snippet;
	}

	let { icon, title, value, unfolded = false, children, actions }: Props = $props();

	const contentId = $props.id();
	let expanded = $state(untrack(() => unfolded));
</script>

{#snippet summary()}
	<span class={value ? 'text-base-content/60 text-xs' : 'text-sm'}>{title}</span>
	{#if value}
		<span class="text-sm/6">{value}</span>
	{/if}
{/snippet}

<div>
	<div class="flex items-start gap-x-3 py-1.5">
		<span class="flex h-11 items-center"><ToneIcon {icon} /></span>
		<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
			{#if children}
				<button
					type="button"
					class="flex min-h-11 max-w-full min-w-56 cursor-pointer items-center gap-2 text-left"
					aria-expanded={expanded}
					aria-controls={expanded ? contentId : undefined}
					onclick={() => (expanded = !expanded)}
				>
					<span class="flex min-w-0 flex-col gap-1">{@render summary()}</span>
					<i
						aria-hidden="true"
						class="ph-duotone ph-caret-down text-base-content/60 transition-transform duration-200 {expanded
							? 'rotate-180'
							: ''}"
					></i>
				</button>
			{:else}
				<div class="flex min-h-11 max-w-full min-w-56 flex-col justify-center gap-1">
					{@render summary()}
				</div>
			{/if}
			{@render actions?.()}
		</div>
	</div>
	{#if expanded && children}
		<div id={contentId} class="pb-3 pl-9" transition:slide={{ duration: 200 }}>
			{@render children()}
		</div>
	{/if}
</div>
