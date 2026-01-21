<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Markdown from '$lib/components/Markdown/Markdown.svelte';

	interface Props {
		info: string;
		showExpanded?: boolean;
	}

	let { info, showExpanded = false }: Props = $props();
	let isExpanded = $state(showExpanded);

	const TRUNCATE_THRESHOLD = 400;
	const shouldTruncate = $derived(!showExpanded && info.length > TRUNCATE_THRESHOLD);
</script>

<div
	class="rounded-lg border border-info/40 bg-base-100/50 p-4 shadow-[0_0_12px_rgba(var(--in)/0.15)]"
>
	<div
		class={shouldTruncate && !isExpanded
			? 'relative max-h-32 overflow-hidden before:absolute before:bottom-0 before:left-0 before:h-16 before:w-full before:bg-gradient-to-t before:from-base-100/90 before:to-transparent'
			: ''}
	>
		<div class="prose prose-sm max-w-none">
			<Markdown source={info} />
		</div>
	</div>

	{#if shouldTruncate}
		<div class="mt-2 flex justify-center">
			<button class="btn btn-ghost btn-sm text-info" onclick={() => (isExpanded = !isExpanded)}>
				{#if isExpanded}
					<i class="fa-solid fa-chevron-up mr-1"></i>
					{m.showLess()}
				{:else}
					<i class="fa-solid fa-chevron-down mr-1"></i>
					{m.showMore()}
				{/if}
			</button>
		</div>
	{/if}
</div>
