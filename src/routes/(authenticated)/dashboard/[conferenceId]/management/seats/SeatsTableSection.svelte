<script lang="ts">
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
	<div
		class="border-base-content/20 rounded-box max-h-[calc(100dvh-8rem)] w-full overflow-auto border"
	>
		<!-- borders sit on the cells: the pinned ones would otherwise leave gaps in collapsed row borders -->
		<table
			class="table-pin-rows table-pin-cols table border-separate border-spacing-0 text-center [&_td]:border-r [&_td]:border-b [&_th]:border-r [&_th]:border-b [&_td]:border-base-content/15 [&_th]:border-base-content/15 [&_tr>:last-child]:border-r-0 [&_tbody>tr:last-child>*]:border-b-0"
		>
			{@render children()}
		</table>
	</div>
</section>
