<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A spinner while `loading`, the error once one occurred, and the content otherwise. */
	interface Props {
		loading: boolean;
		error: string | undefined;
		children: Snippet;
	}

	let { loading, error, children }: Props = $props();
</script>

{#if loading}
	<div class="flex justify-center p-8">
		<i aria-hidden="true" class="ph-duotone ph-spinner-gap animate-spin text-4xl"></i>
	</div>
{:else if error}
	<div class="alert alert-error">
		<i aria-hidden="true" class="ph-duotone ph-warning"></i>
		<span>{error}</span>
	</div>
{:else}
	{@render children()}
{/if}
