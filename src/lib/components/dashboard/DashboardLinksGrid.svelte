<script lang="ts">
	import type { Snippet } from 'svelte';
	import { masonry } from '#lib/attachments/masonry';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<!-- Cards are as tall as their content, the next ones move up below them -->
<div class="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3" {@attach masonry}>
	{@render children()}
</div>
