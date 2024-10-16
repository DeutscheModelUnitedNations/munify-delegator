<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		className?: string;
		children: Snippet;
	}

	let { className, children }: Props = $props();
</script>

<div class="stats stats-vertical shadow sm:stats-horizontal {className} bg-base-200">
	{@render children()}
</div>
