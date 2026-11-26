<script lang="ts">
	import type { Snippet } from 'svelte';
	import ToneIcon, { type Tone } from './ToneIcon.svelte';

	/** One fact of a `Section`: what it is, its value below, what changes it beside it. */
	interface Props {
		icon: string;
		title: string;
		tone?: Tone;
		children?: Snippet;
		actions?: Snippet;
	}

	let { icon, title, tone = 'neutral', children, actions }: Props = $props();
</script>

<div class="flex items-start gap-x-3 py-1.5">
	<span class="flex h-11 items-center"><ToneIcon {icon} {tone} /></span>
	<div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
		<!-- As high with a value as without, so the rows of every section keep one rhythm.
		     As wide as a status's name at least, so what follows stands in one line down the section -->
		<div class="flex min-h-11 max-w-full min-w-56 flex-col justify-center gap-1">
			<span class={children ? 'text-base-content/60 text-xs' : 'text-sm'}>{title}</span>
			{#if children}
				<div class="text-sm/6">{@render children()}</div>
			{/if}
		</div>
		{#if actions}
			<div class="flex flex-wrap items-center gap-1">{@render actions()}</div>
		{/if}
	</div>
</div>
