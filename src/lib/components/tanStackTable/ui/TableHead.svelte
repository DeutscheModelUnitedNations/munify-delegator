<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLThAttributes } from 'svelte/elements';

	interface Props extends HTMLThAttributes {
		children: Snippet;
	}

	let { children, class: className = '', ...rest }: Props = $props();
</script>

<th class={className} {...rest}>
	{@render children()}
</th>
