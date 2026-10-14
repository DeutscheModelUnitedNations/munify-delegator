<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableSectionElement> {
		children: Snippet;
	}

	let { children, class: className = '', ...rest }: Props = $props();
</script>

<thead class={className} {...rest}>
	{@render children()}
</thead>
