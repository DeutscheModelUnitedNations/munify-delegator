<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		children: Snippet;
	}

	let { title, description, children }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<h3 class="text-xl font-bold">{title}</h3>
	<p>{@html description}</p>
	{@render children()}
</div>
