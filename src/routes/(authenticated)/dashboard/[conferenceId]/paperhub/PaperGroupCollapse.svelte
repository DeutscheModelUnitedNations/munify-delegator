<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		expanded: boolean;
		onToggle: () => void;
		/** A committee is an outer group, an agenda item a group nested inside it. */
		level: 'committee' | 'agendaItem';
		/** Background tint on hover, e.g. `hover:bg-primary/5`. */
		hoverClass?: string;
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
		header,
		aside,
		children
	}: Props = $props();

	const isCommittee = $derived(level === 'committee');
</script>

<div
	class="collapse {expanded ? 'collapse-open' : ''} {isCommittee
		? 'bg-base-200'
		: 'border-t border-base-300 rounded-none'}"
>
	<button
		type="button"
		class="flex w-full items-center justify-between gap-x-3 gap-y-2 max-sm:flex-wrap text-left transition-colors {hoverClass} {isCommittee
			? 'p-4 rounded-box'
			: 'px-4 py-3'}"
		aria-expanded={expanded}
		onclick={onToggle}
	>
		<span class="flex min-w-0 items-center {isCommittee ? 'gap-3' : 'gap-2'}">
			<i
				class="fa-sharp-duotone fa-solid fa-chevron-right text-base-content/50 text-sm transition-transform duration-200 {expanded
					? 'rotate-90'
					: ''}"
			></i>
			{@render header()}
		</span>
		{@render aside?.()}
	</button>

	<div class="collapse-content px-0 pb-0">
		{@render children()}
	</div>
</div>
