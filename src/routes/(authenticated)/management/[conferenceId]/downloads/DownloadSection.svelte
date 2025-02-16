<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<h2 class="text-xl font-bold">{title}</h2>
	<div class="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2">
		{@render children()}
	</div>
</div>
