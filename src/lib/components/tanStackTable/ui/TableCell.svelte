<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTdAttributes } from 'svelte/elements';

	interface Props extends HTMLTdAttributes {
		children: Snippet;
	}

	let { children, class: className = '', ...rest }: Props = $props();
</script>

<td class="max-w-[24ch] truncate {className}" {...rest}>
	{@render children()}
</td>
