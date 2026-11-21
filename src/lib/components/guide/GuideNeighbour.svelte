<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The previous or next page, as a large link. */
	interface Props {
		entry: { key: string; pageId: string; title: string };
		direction: 'previous' | 'next';
		hrefOf: (entry: { pageId: string; key?: string }) => string;
	}

	let { entry, direction, hrefOf }: Props = $props();
	const next = $derived(direction === 'next');
</script>

<a
	class="btn btn-ghost h-auto py-3 {next
		? 'justify-end text-end sm:col-start-2'
		: 'justify-start text-start'}"
	href={hrefOf(entry)}
>
	{#if !next}<i class="ph-duotone ph-arrow-left" aria-hidden="true"></i>{/if}
	<span class="flex flex-col {next ? 'items-end' : 'items-start'}">
		<span class="text-xs opacity-60">{next ? m.guideNext() : m.guidePrevious()}</span>
		<span>{entry.title}</span>
	</span>
	{#if next}<i class="ph-duotone ph-arrow-right" aria-hidden="true"></i>{/if}
</a>
