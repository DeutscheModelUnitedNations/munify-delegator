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
		<i class="fa-duotone fa-spinner fa-spin text-4xl"></i>
	</div>
{:else if error}
	<div class="alert alert-error">
		<i class="fa-solid fa-exclamation-triangle"></i>
		<span>{error}</span>
	</div>
{:else}
	{@render children()}
{/if}
