<script lang="ts">
	import type { Snippet } from 'svelte';
	import Divider from './Divider.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-[auto_1fr] sm:gap-y-0">
	<Divider />
	{@render children()}
</div>
