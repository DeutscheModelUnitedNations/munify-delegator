<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<ul
	class="menu menu-horizontal w-full flex-wrap bg-base-100 border-base-300 border-1 shadow-box rounded-box mb-4 gap-1"
>
	{@render children()}
</ul>
