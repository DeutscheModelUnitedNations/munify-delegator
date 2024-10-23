<script lang="ts">
	import type { Snippet } from "svelte";

	interface Props {
		small?: boolean;
		children: Snippet;
	}

	let { small = false, children }: Props = $props();
</script>

<ul class="menu px-0">
	{@render children()}
</ul>
