<script lang="ts">
	import type { Snippet } from 'svelte';
	import Divider from './Divider.svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-y-0">
	{@render children()}
</div>
