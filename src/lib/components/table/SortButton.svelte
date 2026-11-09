<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		sorted: false | 'asc' | 'desc';
		canSort?: boolean;
		children: Snippet;
	}

	let { sorted, canSort = true, children, class: className = '', ...rest }: Props = $props();
</script>

<button class="flex items-center gap-2 {className}" class:cursor-pointer={canSort} {...rest}>
	{@render children()}
	{#if sorted === 'asc'}
		<i aria-hidden="true" class="ph-duotone ph-sort-ascending text-xs"></i>
	{:else if sorted === 'desc'}
		<i aria-hidden="true" class="ph-duotone ph-sort-descending text-xs"></i>
	{:else if canSort}
		<i aria-hidden="true" class="ph-duotone ph-arrows-down-up text-xs opacity-30"></i>
	{/if}
</button>
