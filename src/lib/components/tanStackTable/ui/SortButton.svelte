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
		<i class="fa-duotone fa-arrow-down-a-z text-xs"></i>
	{:else if sorted === 'desc'}
		<i class="fa-duotone fa-arrow-down-z-a text-xs"></i>
	{:else if canSort}
		<i class="fa-duotone fa-arrows-up-down text-xs opacity-30"></i>
	{/if}
</button>
