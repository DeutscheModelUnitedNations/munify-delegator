<script lang="ts">
	import type { Snippet } from 'svelte';
	import { CARD_COLUMNS } from './columns';
	import ToneIcon, { type Tone } from './ToneIcon.svelte';

	/**
	 * One topic of the user card: a heading and what belongs to it, set off from the topic above by a
	 * rule rather than boxed (as `FormSection`). Its rows (`Row`, `PersonRow`, `Empty`) start with an
	 * icon as the heading does, so everything in a column shares one edge for icons and one for text.
	 */
	interface Props {
		icon: string;
		title: string;
		subtitle?: string;
		tone?: Tone;
		/** The children are columns side by side, as many of the three as fit, rather than rows */
		columns?: boolean;
		actions?: Snippet;
		children: Snippet;
	}

	let {
		icon,
		title,
		subtitle,
		tone = 'primary',
		columns = false,
		actions,
		children
	}: Props = $props();
</script>

<section class="border-base-content/15 flex min-w-0 flex-col gap-2 border-t pt-4 pb-2">
	<header class="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1">
		<ToneIcon {icon} {tone} />
		<h3 class="text-base leading-tight font-bold">{title}</h3>
		{#if subtitle}
			<p class="text-base-content/60 text-sm">{subtitle}</p>
		{/if}
		{#if actions}
			<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
		{/if}
	</header>
	<div class={['min-w-0', columns ? [CARD_COLUMNS, 'gap-y-2'] : 'flex flex-col']}>
		{@render children()}
	</div>
</section>
