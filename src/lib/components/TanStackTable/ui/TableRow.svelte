<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLTableRowElement> {
		children: Snippet;
		selected?: boolean;
	}

	let { children, selected = false, class: className = '', ...rest }: Props = $props();
</script>

<tr class="hover:!bg-base-300 cursor-pointer {selected ? 'bg-accent' : ''} {className}" {...rest}>
	{@render children()}
</tr>
