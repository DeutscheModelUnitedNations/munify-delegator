<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		expanded: boolean;
		onToggle: () => void;
		/** A committee is an outer group, an agenda item a group nested inside it. */
		level: 'committee' | 'agendaItem';
		/** Background tint on hover, e.g. `hover:bg-primary/5`. */
		hoverClass?: string;
		/** Alternating background for nested groups. */
		striped?: boolean;
		/** Left side of the header, after the chevron. */
		header: Snippet;
		/** Right side of the header: counts, badges. */
		aside?: Snippet;
		/** Shown while expanded. */
		children: Snippet;
	}

	let {
		expanded,
		onToggle,
		level,
		hoverClass = level === 'committee' ? 'hover:bg-primary/5' : 'hover:bg-secondary/5',
		striped = false,
		header,
		aside,
		children
	}: Props = $props();

	let isCommittee = $derived(level === 'committee');
</script>

<div
	class={isCommittee
		? 'border border-base-300 rounded-box bg-base-100'
		: 'border border-base-200 rounded-field mb-2 last:mb-0'}
	class:bg-base-50={striped}
>
	<div
		class="cursor-pointer transition-colors {hoverClass} {isCommittee
			? 'p-4 rounded-t-box'
			: 'p-3 rounded-t-field'}"
		class:rounded-b-box={isCommittee && !expanded}
		class:rounded-b-field={!isCommittee && !expanded}
		onclick={onToggle}
		role="button"
		tabindex="0"
		onkeypress={(e) => e.key === 'Enter' && onToggle()}
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center {isCommittee ? 'gap-3' : 'gap-2'}">
				<i
					class="fa-sharp-duotone fa-solid {expanded
						? 'fa-chevron-down'
						: 'fa-chevron-right'} {isCommittee
						? 'text-base-content/50'
						: 'text-base-content/40 text-sm'}"
				></i>
				{@render header()}
			</div>
			{@render aside?.()}
		</div>
	</div>

	{#if expanded}
		{@render children()}
	{/if}
</div>
