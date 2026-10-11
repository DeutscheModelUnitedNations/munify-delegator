<script lang="ts">
	import { DataTable } from '$lib/components/tanStackTable/ui';
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
		downloadButton?: Snippet;
	}

	let { title, children, downloadButton }: Props = $props();
</script>

<section class="flex w-full flex-col items-start gap-4">
	{#if title || downloadButton}
		<h1 class="text-2xl font-bold">
			{title}
			{#if downloadButton}
				{@render downloadButton()}
			{/if}
		</h1>
	{/if}

	<!-- fits the viewport and scrolls inside itself, so the header row and the first column never leave the screen -->
	<!-- fits the viewport and scrolls inside itself, so the header row and the first column never leave the screen -->
	<DataTable.Root
		wrapperClass="max-h-[calc(100dvh-8rem)] w-full"
		class="table-pin-cols text-center"
	>
		{@render children()}
	</DataTable.Root>
</section>
