<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
		downloadButton?: Snippet;
	}

	let { title, children, downloadButton }: Props = $props();
</script>

<section class="flex w-full flex-col items-start gap-4">
	<h1 class="text-2xl font-bold">
		{title}
		{#if downloadButton}
			{@render downloadButton()}
		{/if}
	</h1>

	<div class="block w-full overflow-y-scroll md:contents">
		<table class="table-pin-rows table text-center">
			{@render children()}
		</table>
	</div>
</section>
